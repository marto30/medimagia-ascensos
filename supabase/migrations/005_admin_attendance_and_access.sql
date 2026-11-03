-- Run as the database owner after 003/004 and ONE of the original 001 schemas.
BEGIN;

-- Profile roles are server-owned; JWT user metadata is not an authority.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE((SELECT p.role FROM public.profiles AS p WHERE p.id = auth.uid()), 'student');
$$;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.current_user_role() IN ('admin', 'superadmin'); $$;
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.current_user_role() = 'superadmin'; $$;

-- Invoker trigger: direct API clients cannot give themselves privileged roles.
-- Trusted database/service-role provisioning and existing admin workflows remain valid.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_admin() THEN
    IF (TG_OP = 'INSERT' AND NEW.role <> 'student') OR
       (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Only administrators may assign profile roles' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Replace the recursive legacy self-update policy without allowing role changes.
DROP POLICY IF EXISTS "Users can update own profile (name only)" ON public.profiles;
CREATE POLICY "Users can update own profile (name only)" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = public.current_user_role());
DROP POLICY IF EXISTS "Admins read access identities" ON public.profiles;
CREATE POLICY "Admins read access identities" ON public.profiles
FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.access_logs ADD COLUMN IF NOT EXISTS
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);

-- Clear both initial-schema variants and any additional permissive policies.
DO $$
DECLARE
  table_name TEXT;
  old_policy RECORD;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'attendance_sessions', 'attendance_records', 'access_logs', 'blocked_ips'
  ] LOOP
    FOR old_policy IN SELECT policyname FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE pg_catalog.format('DROP POLICY %I ON public.%I', old_policy.policyname, table_name);
    END LOOP;
    EXECUTE pg_catalog.format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE pg_catalog.format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    EXECUTE pg_catalog.format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    EXECUTE pg_catalog.format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', table_name);
    EXECUTE pg_catalog.format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    EXECUTE pg_catalog.format(
      'CREATE POLICY "Administrators only" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      table_name);
  END LOOP;
END;
$$;

-- Narrow append-only entry point: caller supplies telemetry, never an account ID.
CREATE OR REPLACE FUNCTION public.record_access(p_ip_hash TEXT, p_ua TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{64}$' OR
     p_ua IS NULL OR pg_catalog.char_length(p_ua) > 100 THEN
    RAISE EXCEPTION 'Invalid access telemetry' USING ERRCODE = '22023';
  END IF;
  IF v_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Authenticated profile required' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_ips WHERE ip_hash = p_ip_hash) THEN
    RETURN pg_catalog.jsonb_build_object('blocked', TRUE);
  END IF;
  INSERT INTO public.access_logs (ip_hash, ts, ua, user_id)
    VALUES (p_ip_hash, pg_catalog.now(), p_ua, v_user_id);
  RETURN pg_catalog.jsonb_build_object('blocked', FALSE);
END;
$$;
REVOKE ALL ON FUNCTION public.record_access(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_access(TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
