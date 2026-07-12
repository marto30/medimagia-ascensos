-- =====================================================================
-- MEDIMAGIA ASCENSOS - Attendance tracking
-- =====================================================================

-- Sesiones de asistencia (una por clase/evento)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Clase',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(session_date);

-- Registro de asistencia por alumno y sesión
CREATE TABLE IF NOT EXISTS public.attendance_records (
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);

-- RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los autenticados
CREATE POLICY "All authenticated can read" ON public.attendance_sessions FOR SELECT USING (true);
CREATE POLICY "All authenticated can read" ON public.attendance_records FOR SELECT USING (true);

-- Escritura solo para admins
CREATE POLICY "Admins manage attendance_sessions" ON public.attendance_sessions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage attendance_records" ON public.attendance_records FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL PRIVILEGES ON public.attendance_sessions TO service_role;
GRANT ALL PRIVILEGES ON public.attendance_records TO service_role;
