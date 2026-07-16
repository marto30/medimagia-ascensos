-- =====================================================================
-- MEDIMAGIA ASCENSOS - RPC para borrar alumnos de forma completa
-- Ejecutar en el SQL Editor del dashboard de Supabase
-- =====================================================================

CREATE OR REPLACE FUNCTION public.delete_student_full(p_name TEXT)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_username TEXT;
  v_auth_user_id UUID;
BEGIN
  -- Solo admins pueden borrar
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  -- Buscar el alumno
  SELECT id, username INTO v_student_id, v_username
  FROM public.students WHERE name = p_name;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alumno no encontrado');
  END IF;

  -- Borrar dependencias explícitamente (evita errores 23503 de FK sin CASCADE)
  DELETE FROM public.student_spells WHERE student_id = v_student_id;
  DELETE FROM public.infractions WHERE student_id = v_student_id;

  -- Tablas de asistencia (pueden no existir si aún no se aplicó la migración 003)
  BEGIN
    DELETE FROM public.attendance_records WHERE student_id = v_student_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Bitácoras: conservar el registro pero desvincular al alumno
  UPDATE public.bitacora_attendants SET student_id = NULL WHERE student_id = v_student_id;

  -- Credenciales legacy (schema privado)
  BEGIN
    SELECT auth_user_id INTO v_auth_user_id
    FROM private.legacy_credentials WHERE student_id = v_student_id;
    DELETE FROM private.legacy_credentials WHERE student_id = v_student_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Borrar el alumno
  DELETE FROM public.students WHERE id = v_student_id;

  -- Borrar el usuario de Supabase Auth (por id vinculado o por email sintético)
  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_user_id;
  ELSIF v_username IS NOT NULL THEN
    DELETE FROM auth.users
    WHERE email = lower(regexp_replace(v_username, '[^a-zA-Z0-9]', '', 'g')) || '@medimagia.test';
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que los usuarios autenticados llamen la función (el check de admin va dentro)
GRANT EXECUTE ON FUNCTION public.delete_student_full(TEXT) TO authenticated;
