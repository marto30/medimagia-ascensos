-- =====================================================================
-- MEDIMAGIA ASCENSOS - SCHEMA SIMPLIFICADO
-- PostgreSQL Schema v1.0 (sin RLS complejas)
-- =====================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schemas
CREATE SCHEMA IF NOT EXISTS private;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::TEXT,
    'student'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.current_user_role() IN ('admin', 'superadmin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT public.current_user_role() = 'superadmin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== TABLAS =====

-- 1. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'superadmin')),
  source_firestore_id TEXT UNIQUE,
  original_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_firestore_id ON public.profiles(source_firestore_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

-- 2. Ranks
CREATE TABLE public.ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  sort_order INT NOT NULL,
  source_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ranks_name ON public.ranks(name);
INSERT INTO public.ranks (name, sort_order, source_key) VALUES
  ('Aprendiz', 1, 'Aprendiz'),
  ('Principiante', 2, 'Principiante'),
  ('Intermedio', 3, 'Intermedio'),
  ('Avanzado', 4, 'Avanzado'),
  ('Graduado', 5, 'Graduado')
ON CONFLICT (name) DO NOTHING;

-- 3. Spells
CREATE TABLE public.spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  rank_id UUID REFERENCES public.ranks(id) ON DELETE SET NULL,
  sort_order INT,
  source_rank_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spells_rank ON public.spells(rank_id);
CREATE INDEX idx_spells_name ON public.spells(name);

-- 4. Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  current_rank TEXT NOT NULL DEFAULT 'Aprendiz',
  graduated BOOLEAN DEFAULT FALSE,
  source_firestore_id TEXT UNIQUE NOT NULL,
  original_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_username ON public.students(username);
CREATE INDEX idx_students_rank ON public.students(current_rank);
CREATE INDEX idx_students_graduated ON public.students(graduated);
CREATE INDEX idx_students_firestore_id ON public.students(source_firestore_id);
CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

-- 5. Student Spells
CREATE TABLE public.student_spells (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  spell_id UUID NOT NULL REFERENCES public.spells(id) ON DELETE CASCADE,
  learned BOOLEAN NOT NULL DEFAULT FALSE,
  source_spell_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, spell_id)
);

CREATE INDEX idx_student_spells_student ON public.student_spells(student_id);
CREATE INDEX idx_student_spells_learned ON public.student_spells(learned);

-- 6. Infractions
CREATE TABLE public.infractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  infraction_date TIMESTAMPTZ,
  source_index INT,
  original_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, source_index)
);

CREATE INDEX idx_infractions_student ON public.infractions(student_id);

-- 7. Bitacoras
CREATE TABLE public.bitacoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient TEXT NOT NULL,
  diagnosis TEXT,
  procedure TEXT,
  created_by TEXT,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ,
  source_firestore_id TEXT UNIQUE NOT NULL,
  original_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bitacoras_patient ON public.bitacoras(patient);
CREATE INDEX idx_bitacoras_created_by ON public.bitacoras(created_by);
CREATE INDEX idx_bitacoras_firestore_id ON public.bitacoras(source_firestore_id);
CREATE INDEX idx_bitacoras_created_at ON public.bitacoras(created_at);
CREATE TRIGGER bitacoras_updated_at BEFORE UPDATE ON public.bitacoras FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

-- 8. Bitacora Attendants
CREATE TABLE public.bitacora_attendants (
  bitacora_id UUID NOT NULL REFERENCES public.bitacoras(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  attendant_name TEXT NOT NULL,
  PRIMARY KEY (bitacora_id, attendant_name)
);

CREATE INDEX idx_bitacora_attendants_student ON public.bitacora_attendants(student_id);
CREATE INDEX idx_bitacora_attendants_bitacora ON public.bitacora_attendants(bitacora_id);

-- 9. Bitacora Edit History
CREATE TABLE public.bitacora_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitacora_id UUID NOT NULL REFERENCES public.bitacoras(id) ON DELETE CASCADE,
  editor TEXT,
  editor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  edit_number INT,
  original_data JSONB,
  UNIQUE(bitacora_id, edit_number)
);

CREATE INDEX idx_edit_history_bitacora ON public.bitacora_edit_history(bitacora_id);
CREATE INDEX idx_edit_history_editor ON public.bitacora_edit_history(editor);

-- 10. Potions
CREATE TABLE public.potions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  qty INT NOT NULL DEFAULT 0,
  original_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_potions_category ON public.potions(category);
CREATE TRIGGER potions_updated_at BEFORE UPDATE ON public.potions FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

-- 11. Bitacora Potions
CREATE TABLE public.bitacora_potions (
  bitacora_id UUID NOT NULL REFERENCES public.bitacoras(id) ON DELETE CASCADE,
  potion_id TEXT NOT NULL REFERENCES public.potions(id) ON DELETE RESTRICT,
  qty INT DEFAULT 1,
  PRIMARY KEY (bitacora_id, potion_id)
);

CREATE INDEX idx_bitacora_potions_bitacora ON public.bitacora_potions(bitacora_id);
CREATE INDEX idx_bitacora_potions_potion ON public.bitacora_potions(potion_id);

-- 12. App Config
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER app_config_updated_at BEFORE UPDATE ON public.app_config FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

INSERT INTO public.app_config (key, value) VALUES
  ('migration_status', '{"completed_at": "2026-06-12T00:00:00Z", "source": "firebase"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 13. Access Logs
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  ts TIMESTAMPTZ,
  ua TEXT,
  source_firestore_id TEXT UNIQUE,
  original_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_logs_ip ON public.access_logs(ip_hash);
CREATE INDEX idx_access_logs_ts ON public.access_logs(ts);

-- 14. Blocked IPs
CREATE TABLE public.blocked_ips (
  ip_hash TEXT PRIMARY KEY,
  blocked_at TIMESTAMPTZ,
  source_firestore_id TEXT UNIQUE,
  original_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER blocked_ips_updated_at BEFORE UPDATE ON public.blocked_ips FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

-- ===== TABLAS PRIVADAS =====

-- 15. Legacy Credentials (Private)
CREATE TABLE private.legacy_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  password_hash_sha256 TEXT NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  migrated_at TIMESTAMPTZ,
  source_firestore_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legacy_creds_username ON private.legacy_credentials(username);
CREATE INDEX idx_legacy_creds_student ON private.legacy_credentials(student_id);

-- 16. Admin Legacy Credentials (Private)
CREATE TABLE private.admin_legacy_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  password_hash_sha256 TEXT NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  migrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== RLS POLICIES (Simples) =====

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.potions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.legacy_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_legacy_credentials ENABLE ROW LEVEL SECURITY;

-- Políticas simples (sin referencias circulares)
CREATE POLICY "All authenticated can read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.students FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.student_spells FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.infractions FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.bitacoras FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.potions FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.access_logs FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.blocked_ips FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.app_config FOR SELECT USING (true);

CREATE POLICY "No default access" ON private.legacy_credentials FOR ALL USING (false);
CREATE POLICY "No default access" ON private.admin_legacy_credentials FOR ALL USING (false);

-- ===== PERMISOS =====

REVOKE ALL ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA private TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA private TO service_role;

-- FIN
