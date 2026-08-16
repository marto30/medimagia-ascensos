-- =====================================================================
-- MEDIMAGIA ASCENSOS - Borrado completo de alumnos
--
-- >>> EJECUTAR ESTE ARCHIVO ENTERO EN:
-- >>> Supabase Dashboard -> SQL Editor -> New query -> Pegar -> Run
--
-- Resuelve el error 23503 (violación de clave foránea) al eliminar un
-- medimago: limpia automáticamente TODAS las tablas que lo referencian,
-- sin importar cómo estén declaradas sus claves foráneas.
--
-- GARANTÍA: el nombre del medimago NO desaparece de las bitácoras. El
-- historial se conserva intacto; solo se rompe el vínculo interno.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.delete_student_full(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_student_id   UUID;
  v_username     TEXT;
  v_email        TEXT;
  v_caller_email TEXT;
  v_caller_role  TEXT;
  v_is_admin     BOOLEAN;
  v_cleaned      TEXT[] := ARRAY[]::TEXT[];
  r              RECORD;
BEGIN
  -- ── 1. Verificar que quien llama es administrador ──────────────────
  -- Se aceptan tres vías para no depender de una sola configuración:
  --   a) la función is_admin() existente
  --   b) el rol dentro de user_metadata del JWT
  --   c) el email sintético de admin/superadmin
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_caller_role  := coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '');

  BEGIN
    v_is_admin := coalesce(public.is_admin(), FALSE);
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := FALSE;
  END;

  v_is_admin := v_is_admin
                OR v_caller_role IN ('admin', 'superadmin')
                OR v_caller_email IN ('admin@medimagia.test', 'superadmin@medimagia.test');

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Se requiere una sesión de administrador para eliminar alumnos.'
    );
  END IF;

  -- ── 2. Localizar al alumno ─────────────────────────────────────────
  SELECT id, username INTO v_student_id, v_username
  FROM public.students
  WHERE name = p_name;

  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Alumno no encontrado: ' || p_name);
  END IF;

  -- ── 3a. CONSERVAR EL NOMBRE EN LAS BITÁCORAS ──────────────────────
  -- El nombre del medimago se guarda como texto en attendant_name, así
  -- que la bitácora lo sigue mostrando aunque el alumno ya no exista:
  -- basta con romper el vínculo.
  --
  -- Se hace ANTES de borrar al alumno y sin mirar cómo esté declarada la
  -- clave foránea. Si estuviera como ON DELETE CASCADE, el borrado se
  -- llevaría estas filas por delante y los nombres desaparecerían del
  -- historial; al dejar student_id en NULL primero, no queda nada que
  -- el CASCADE pueda arrastrar.
  UPDATE public.bitacora_attendants
     SET student_id = NULL
   WHERE student_id = v_student_id;

  v_cleaned := array_append(v_cleaned, 'public.bitacora_attendants (desvinculada, nombre conservado)');

  -- ── 3b. Limpiar el resto de tablas que referencien al alumno ──────
  -- Recorre el catálogo de claves foráneas que apuntan a students(id).
  -- Las declaradas SET NULL se desvinculan; el resto se eliminan.
  FOR r IN
    SELECT n.nspname AS sch,
           c.relname AS tbl,
           a.attname AS col,
           con.confdeltype AS deltype
    FROM pg_constraint con
    JOIN pg_class     c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND con.confrelid = 'public.students'::regclass
      -- ya tratada en 3a, no debe borrarse
      AND NOT (n.nspname = 'public' AND c.relname = 'bitacora_attendants')
  LOOP
    IF r.deltype = 'n' THEN
      EXECUTE format('UPDATE %I.%I SET %I = NULL WHERE %I = $1', r.sch, r.tbl, r.col, r.col)
        USING v_student_id;
    ELSE
      EXECUTE format('DELETE FROM %I.%I WHERE %I = $1', r.sch, r.tbl, r.col)
        USING v_student_id;
    END IF;
    v_cleaned := array_append(v_cleaned, r.sch || '.' || r.tbl);
  END LOOP;

  -- ── 4. Borrar al alumno ────────────────────────────────────────────
  DELETE FROM public.students WHERE id = v_student_id;

  -- ── 5. Borrar su usuario de Supabase Auth ──────────────────────────
  -- En bloque aparte: si falla, no revierte el borrado del alumno.
  IF v_username IS NOT NULL AND length(btrim(v_username)) > 0 THEN
    BEGIN
      v_email := lower(regexp_replace(v_username, '[^a-zA-Z0-9]', '', 'g')) || '@medimagia.test';
      DELETE FROM auth.users WHERE lower(email) = v_email;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'deleted', p_name,
    'cleaned', to_jsonb(v_cleaned)
  );

EXCEPTION WHEN OTHERS THEN
  -- Devuelve el motivo real en vez de un código críptico
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$fn$;

-- El control de administrador va dentro de la función, por eso basta con
-- permitir la ejecución a los usuarios con sesión iniciada.
GRANT EXECUTE ON FUNCTION public.delete_student_full(TEXT) TO authenticated;

-- Refrescar la caché de PostgREST para que la función sea visible al instante
NOTIFY pgrst, 'reload schema';
