-- =====================================================================
-- MEDIMAGIA ASCENSOS - MIGRACIÓN SUPABASE
-- PostgreSQL Schema v1.0
-- Migración desde Firebase/Firestore a PostgreSQL
-- =====================================================================

-- =====================================================================
-- 1. EXTENSIONES
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =====================================================================
-- 2. SCHEMAS
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS private;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM public;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON SEQUENCES FROM public;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON FUNCTIONS FROM public;


-- =====================================================================
-- 3. HELPER FUNCTIONS
-- =====================================================================

-- Obtener rol del usuario actual desde JWT metadata
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::TEXT,
    'student'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Verificar si usuario es admin o superadmin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.current_user_role() IN ('admin', 'superadmin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Verificar si usuario es superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT public.current_user_role() = 'superadmin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Obtener ID del profile del usuario actual
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 4. TABLA: public.profiles
-- =====================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'admin', 'superadmin')),
  source_firestore_id TEXT UNIQUE,
  original_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_firestore_id ON public.profiles(source_firestore_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile (name only)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

COMMENT ON TABLE public.profiles IS 'Profiles vinculados a auth.users, con roles y metadata migrada de Firebase';
COMMENT ON COLUMN public.profiles.source_firestore_id IS 'ID original de Firestore para trazabilidad y rollback';


-- =====================================================================
-- 5. TABLA: public.ranks
-- =====================================================================
CREATE TABLE public.ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  sort_order INT NOT NULL,
  source_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ranks_name ON public.ranks(name);
CREATE INDEX idx_ranks_sort ON public.ranks(sort_order);

INSERT INTO public.ranks (name, sort_order, source_key) VALUES
  ('Aprendiz', 1, 'Aprendiz'),
  ('Principiante', 2, 'Principiante'),
  ('Intermedio', 3, 'Intermedio'),
  ('Avanzado', 4, 'Avanzado'),
  ('Graduado', 5, 'Graduado')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.ranks IS 'Rangos de estudiantes: Aprendiz → Principiante → Intermedio → Avanzado → Graduado';


-- =====================================================================
-- 6. TABLA: public.spells
-- =====================================================================
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

COMMENT ON TABLE public.spells IS '30 hechizos distribuidos en 4 rangos, migrados de Firebase RANKS';


-- =====================================================================
-- 7. TABLA: public.students
-- =====================================================================
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

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own record"
  ON public.students FOR SELECT
  USING (
    profile_id = public.current_profile_id()
    OR public.is_admin()
  );

CREATE POLICY "Students read for autocomplete (own name)"
  ON public.students FOR SELECT
  USING (
    TRUE  -- Todos pueden leer nombres para buscar
  );

CREATE POLICY "Admins can update all"
  ON public.students FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

COMMENT ON TABLE public.students IS '~35 alumnos migrados de alumnos/ collection en Firebase';
COMMENT ON COLUMN public.students.source_firestore_id IS 'ID del documento original en Firebase para trazabilidad';


-- =====================================================================
-- 8. TABLA: public.student_spells
-- =====================================================================
CREATE TABLE public.student_spells (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  spell_id UUID NOT NULL REFERENCES public.spells(id) ON DELETE CASCADE,
  learned BOOLEAN NOT NULL DEFAULT FALSE,
  source_spell_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, spell_id)
);

CREATE INDEX idx_student_spells_learned ON public.student_spells(learned);
CREATE INDEX idx_student_spells_student ON public.student_spells(student_id);

ALTER TABLE public.student_spells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own spells"
  ON public.student_spells FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students
      WHERE profile_id = public.current_profile_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins manage all spells"
  ON public.student_spells FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.student_spells IS 'Relación M2M: cada estudiante tiene 30 hechizos (learned true/false)';


-- =====================================================================
-- 9. TABLA: public.infractions
-- =====================================================================
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

ALTER TABLE public.infractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own infractions"
  ON public.infractions FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students
      WHERE profile_id = public.current_profile_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins can manage infractions"
  ON public.infractions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.infractions IS 'Infracciones de estudiantes, migradas del array "infractions" en Firebase';


-- =====================================================================
-- 10. TABLA: public.bitacoras
-- =====================================================================
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

ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all"
  ON public.bitacoras FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Students read if attendant"
  ON public.bitacoras FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bitacora_attendants ba
      WHERE ba.bitacora_id = id
      AND ba.student_id IN (
        SELECT id FROM public.students
        WHERE profile_id = public.current_profile_id()
      )
    )
  );

CREATE POLICY "Admins update all"
  ON public.bitacoras FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.bitacoras
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

COMMENT ON TABLE public.bitacoras IS 'Bitácoras médicas (records), ~20-30 documentos de Firebase';


-- =====================================================================
-- 11. TABLA: public.bitacora_attendants
-- =====================================================================
CREATE TABLE public.bitacora_attendants (
  bitacora_id UUID NOT NULL REFERENCES public.bitacoras(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  attendant_name TEXT NOT NULL,
  PRIMARY KEY (bitacora_id, attendant_name)
);

CREATE INDEX idx_bitacora_attendants_student ON public.bitacora_attendants(student_id);
CREATE INDEX idx_bitacora_attendants_bitacora ON public.bitacora_attendants(bitacora_id);

COMMENT ON TABLE public.bitacora_attendants IS 'Medimagos que asistieron a cada bitácora (array en Firebase)';


-- =====================================================================
-- 12. TABLA: public.bitacora_edit_history
-- =====================================================================
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

COMMENT ON TABLE public.bitacora_edit_history IS 'Historial de ediciones de bitácoras (array editHistory en Firebase)';


-- =====================================================================
-- 13. TABLA: public.potions
-- =====================================================================
CREATE TABLE public.potions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  qty INT NOT NULL DEFAULT 0,
  original_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_potions_category ON public.potions(category);

ALTER TABLE public.potions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads potions"
  ON public.potions FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins write potions"
  ON public.potions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.potions
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

COMMENT ON TABLE public.potions IS '33 pociones: Pociones, Filtros, Esencias, Ungüentos, Antídotos, Bálsamos, Emplastos, Soluciones, Otros';


-- =====================================================================
-- 14. TABLA: public.bitacora_potions
-- =====================================================================
CREATE TABLE public.bitacora_potions (
  bitacora_id UUID NOT NULL REFERENCES public.bitacoras(id) ON DELETE CASCADE,
  potion_id TEXT NOT NULL REFERENCES public.potions(id) ON DELETE RESTRICT,
  qty INT DEFAULT 1,
  PRIMARY KEY (bitacora_id, potion_id)
);

CREATE INDEX idx_bitacora_potions_bitacora ON public.bitacora_potions(bitacora_id);
CREATE INDEX idx_bitacora_potions_potion ON public.bitacora_potions(potion_id);

COMMENT ON TABLE public.bitacora_potions IS 'Pociones usadas en cada bitácora (array potionsUsed en Firebase)';


-- =====================================================================
-- 15. TABLA: public.app_config
-- =====================================================================
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads config"
  ON public.app_config FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins write config"
  ON public.app_config FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.app_config (key, value) VALUES
  ('migration_status', '{"completed_at": "2026-06-12T00:00:00Z", "source": "firebase"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.app_config IS 'Configuración global de la aplicación (ranks, inventory, etc.)';


-- =====================================================================
-- 16. TABLA: public.access_logs
-- =====================================================================
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

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin reads logs"
  ON public.access_logs FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmin inserts logs"
  ON public.access_logs FOR INSERT
  WITH CHECK (public.is_superadmin());

COMMENT ON TABLE public.access_logs IS 'Logs de acceso IP, migrados de access_logs/ en Firebase (~1000s)';


-- =====================================================================
-- 17. TABLA: public.blocked_ips
-- =====================================================================
CREATE TABLE public.blocked_ips (
  ip_hash TEXT PRIMARY KEY,
  blocked_at TIMESTAMPTZ,
  source_firestore_id TEXT UNIQUE,
  original_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin reads"
  ON public.blocked_ips FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmin writes"
  ON public.blocked_ips FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.blocked_ips
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

COMMENT ON TABLE public.blocked_ips IS 'IPs bloqueadas por seguridad, migradas de blocked_ips/ en Firebase';


-- =====================================================================
-- 18. TABLA PRIVADA: private.legacy_credentials
-- =====================================================================
-- IMPORTANTE: Esta tabla NO es accesible desde anon ni authenticated
-- Solo se accede desde Edge Functions con service_role
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

ALTER TABLE private.legacy_credentials ENABLE ROW LEVEL SECURITY;

-- RLS: Denegar acceso por defecto (solo service_role desde Edge Functions)
CREATE POLICY "No access by default"
  ON private.legacy_credentials FOR ALL
  USING (FALSE);

COMMENT ON TABLE private.legacy_credentials IS 'Credenciales SHA-256 heredadas de Firebase, solo para Edge Function legacy-login';


-- =====================================================================
-- 19. TABLA PRIVADA: private.admin_legacy_credentials
-- =====================================================================
-- IMPORTANTE: Esta tabla NO es accesible desde anon ni authenticated
-- Solo se accede desde Edge Functions con service_role
CREATE TABLE private.admin_legacy_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  password_hash_sha256 TEXT NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  migrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE private.admin_legacy_credentials ENABLE ROW LEVEL SECURITY;

-- RLS: Denegar acceso por defecto
CREATE POLICY "No access by default"
  ON private.admin_legacy_credentials FOR ALL
  USING (FALSE);

COMMENT ON TABLE private.admin_legacy_credentials IS 'Credenciales SHA-256 heredadas de admin, solo para Edge Function admin-legacy-login';


-- =====================================================================
-- 20. VISTAS ÚTILES (Opcional, para debugging)
-- =====================================================================

-- Vista: estudiantes con su rango actual y progreso
CREATE OR REPLACE VIEW public.v_student_progress AS
SELECT
  s.id,
  s.name,
  s.username,
  s.current_rank,
  s.graduated,
  r.sort_order as rank_order,
  COUNT(CASE WHEN ss.learned = true THEN 1 END) as spells_learned,
  COUNT(*) as total_spells
FROM public.students s
LEFT JOIN public.ranks r ON s.current_rank = r.name
LEFT JOIN public.student_spells ss ON s.id = ss.student_id
GROUP BY s.id, s.name, s.username, s.current_rank, s.graduated, r.sort_order
ORDER BY s.current_rank, s.name;

COMMENT ON VIEW public.v_student_progress IS 'Vista de progreso de estudiantes: nombre, rango, hechizos aprendidos/totales';


-- =====================================================================
-- 21. PERMISOS FINALES
-- =====================================================================

-- El usuario anon tiene acceso limitado
REVOKE ALL ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- Service role (Edge Functions)
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA private TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA private TO service_role;


-- =====================================================================
-- FIN DEL SCHEMA
-- =====================================================================
-- Fecha: 2026-06-12
-- Migración: Firebase Firestore → PostgreSQL/Supabase
-- Estado: ✅ Listo para importación de datos
-- =====================================================================
