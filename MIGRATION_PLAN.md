# 🔄 PLAN TÉCNICO DE MIGRACIÓN: FIREBASE → SUPABASE

**Versión:** 1.0  
**Fecha:** 2026-06-12  
**Estado:** Pendiente de Implementación  
**Responsable:** Migración Medimagia Ascensos  

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Análisis del Estado Actual](#análisis-del-estado-actual)
3. [Arquitectura de Destino (Supabase)](#arquitectura-de-destino)
4. [Estrategia de Migración](#estrategia-de-migración)
5. [Diseño de Base de Datos PostgreSQL](#diseño-de-base-de-datos-postgresql)
6. [Scripts de Migración](#scripts-de-migración)
7. [Edge Functions](#edge-functions)
8. [Adaptación del Frontend](#adaptación-del-frontend)
9. [Seguridad y Validación](#seguridad-y-validación)
10. [Rollback y Recuperación](#rollback-y-recuperación)
11. [Checklist de Producción](#checklist-de-producción)

---

## ✅ RESUMEN EJECUTIVO

### Objetivo
Migrar **Medimagia Ascensos** desde Firebase/Firestore a Supabase (PostgreSQL) **sin pérdida de datos**, preservando:
- Todos los alumnos y credenciales
- Toda la información de hechizos, rangos, graduaciones
- Todas las bitácoras médicas y su historial
- Infracciones y logs de acceso
- Configuración de inventario y rangos
- **Acceso sin interrupción** para usuarios existentes

### Principios de la Migración
- ✅ **No destructivo**: Firebase queda intacto hasta validación completa
- ✅ **Idempotente**: Puede ejecutarse múltiples veces sin duplicados
- ✅ **Reversible**: Plan de rollback documentado
- ✅ **Validado**: Checksums y conteos antes/después
- ✅ **Seguro**: Autenticación legacy para usuarios existentes
- ✅ **Transparente**: Los usuarios no sienten cambios

### Timeline Estimado
- **Fase 1 (Preparación):** 2-3 horas
  - Crear proyecto Supabase
  - Configurar base de datos
  - Crear Edge Functions
  
- **Fase 2 (Migración):** 1-2 horas
  - Exportar datos de Firebase
  - Validar integridad
  - Importar a Supabase
  
- **Fase 3 (Testing):** 2-3 horas
  - Pruebas de login legacy
  - Pruebas de funcionalidad completa
  - Verificación de datos
  
- **Fase 4 (Deployment):** 1 hora
  - Cambiar DNS/frontend
  - Monitoreo
  - Rollback si es necesario

---

## 🔍 ANÁLISIS DEL ESTADO ACTUAL

### Stack Firebase Actual

#### Datos Almacenados en Firestore

```
medimagia-ascensos (project)
├── alumnos/ (collection)
│   └── [student_name] (document)
│       ├── name: string
│       ├── username: string
│       ├── studentPasswordHash: string (SHA-256)
│       ├── currentRank: string ("Aprendiz", "Principiante", "Intermedio", "Avanzado")
│       ├── graduated: boolean
│       ├── spells: object { [spell_name]: boolean }
│       ├── infractions: array of { reason: string, date: ISO8601 }
│       └── timestamp: ISO8601
│
├── bitacoras/ (collection)
│   └── [auto_id] (document)
│       ├── patient: string
│       ├── diagnosis: string
│       ├── procedure: string
│       ├── attendants: array of string (nombres de medimagos)
│       ├── potionsUsed: array of string (potion_ids)
│       ├── createdAt: ISO8601
│       ├── createdBy: string (username del medimago)
│       └── editHistory: array of {
│           ├── editor: string
│           ├── editedAt: ISO8601
│           └── editNumber: int
│       }
│
├── config/ (collection)
│   ├── admin (document)
│   │   ├── passwordHash: string (SHA-256)
│   │   └── superPasswordHash: string (SHA-256)
│   │
│   ├── ranks (document)
│   │   ├── order: array of string
│   │   └── spells: object { [rank_name]: array of spell_names }
│   │
│   └── inventory (document)
│       └── [potion_id]: int (cantidad)
│
├── access_logs/ (collection)
│   └── [auto_id] (document)
│       ├── ip: string (SHA-256 hash)
│       ├── ts: ISO8601
│       └── ua: string
│
└── blocked_ips/ (collection)
    └── [auto_id] (document)
        ├── ip: string (SHA-256 hash)
        └── blockedAt: ISO8601
```

#### Autenticación Actual

**Escenario B Confirmado**: Las credenciales de estudiantes están **solo en Firestore**, no en Firebase Auth:
- Campo `username`: identificador único
- Campo `studentPasswordHash`: SHA-256 con salt incorporado
- Admin/SuperAdmin: Hashes en config/admin sin recuperación posible

#### Seguridad Implementada

1. **Rate Limiting**: 5 intentos = 15 min bloqueado (localStorage)
2. **Session Timeout**: 30 min inactividad (solo admin)
3. **IP Hashing**: SHA-256 irreversible para logs
4. **Session Persistent**: 30 días con localStorage
5. **HTTPS Forzado**: Excepto localhost
6. **Sanitización**: escHtml(), safeAttr(), safeStr()

#### Datos a Migrar

| Colección | Documentos | Campos Críticos | Complejidad |
|-----------|-----------|-----------------|------------|
| alumnos | ~35 | spells (30), infractions | Media |
| bitacoras | ~20-30 | attendants, potionsUsed, editHistory | Alta |
| config/admin | 1 | 2 hashes | Baja |
| config/ranks | 1 | order, spells | Baja |
| config/inventory | 1 | 33 pociones | Baja |
| access_logs | ~1000s | ip_hash, ts, ua | Media |
| blocked_ips | ~10s | ip_hash, blockedAt | Baja |

**Total de Registros a Migrar**: ~1,100-2,000

---

## 🏗️ ARQUITECTURA DE DESTINO (SUPABASE)

### Ventajas de Supabase

✅ **PostgreSQL nativo**: ACID, triggers, RLS  
✅ **Auth integrado**: Supabase Auth (email/password, OAuth, SSO)  
✅ **Edge Functions**: Ejecución serverless segura  
✅ **Realtime**: Suscripciones (opcional)  
✅ **Row Level Security**: Control granular por fila  
✅ **Backups automáticos**: Recuperación de datos  
✅ **Escalabilidad**: Base de datos gestionada  
✅ **Compatible con Supabase JS SDK**: Fácil migración de frontend  

### Topología Supabase

```
Supabase Project (medimagia-ascensos)
├── PostgreSQL (12 GB inicial)
├── Supabase Auth (JWT)
├── Edge Functions (Deno runtime)
├── Realtime (WebSocket subscriptions)
├── Buckets (para futuros uploads)
└── Logging & Monitoring
```

---

## 🔄 ESTRATEGIA DE MIGRACIÓN

### Flujo General

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: PREPARACIÓN                                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Crear proyecto Supabase                                 │
│ 2. Crear todas las tablas PostgreSQL                       │
│ 3. Activar RLS y políticas                                 │
│ 4. Crear Edge Functions                                    │
│ 5. Verificar permisos service_role                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: EXPORTACIÓN Y VALIDACIÓN                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Ejecutar export-firestore.js                            │
│    - Exporta JSON de cada colección                        │
│    - Genera manifest.json con checksums                    │
│    - Backup con timestamp                                  │
│ 2. Ejecutar validate-export.js                             │
│    - Verifica JSON válido                                  │
│    - Detecta campos obligatorios faltantes                │
│    - Genera reporte de warnings                            │
│ 3. Revisar reporte de validación                           │
│    - Resolver cualquier error crítico                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: IMPORTACIÓN (DRY-RUN)                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Ejecutar dry-run.js                                     │
│    - Simula importación sin escribir                       │
│    - Valida integridad de foreign keys                     │
│    - Muestra cambios esperados                             │
│ 2. Revisar reporte de cambios esperados                    │
│    - Verificar conteos coinciden                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 4: IMPORTACIÓN (REAL)                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Ejecutar import-supabase.js                             │
│    - Inserta/upsert en Supabase                            │
│    - Idempotente: puede reejecutarse                       │
│    - Transacciones por lote                                │
│ 2. Monitorear logs de importación                          │
│    - Sin errores SQL críticos                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 5: VERIFICACIÓN POST-IMPORTACIÓN                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Ejecutar verify-supabase.js                             │
│    - Compara conteos Firebase vs Supabase                  │
│    - Calcula checksums de datos críticos                   │
│    - Genera reporte final                                  │
│ 2. Validar coincidencia 100%                               │
│    - Alumnos: ✓                                            │
│    - Bitácoras: ✓                                          │
│    - Pociones: ✓                                           │
│    - Etc.                                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 6: TESTING DE FUNCIONALIDAD                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Pruebas de autenticación                                │
│    - Login legacy (usuario existente)                      │
│    - Migración a Supabase Auth                             │
│    - Login con usuario ya migrado                          │
│ 2. Pruebas de operaciones CRUD                             │
│    - Cargar estudiantes                                    │
│    - Editar perfil                                         │
│    - Agregar bitácora                                      │
│    - Cambiar inventario                                    │
│ 3. Pruebas de roles                                        │
│    - Estudiante: ver solo su data                          │
│    - Admin: ver todo                                       │
│    - SuperAdmin: acceso sin restricciones                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 7: DEPLOYMENT A PRODUCCIÓN                             │
├─────────────────────────────────────────────────────────────┤
│ 1. Cambiar frontend (app.js): Firebase → Supabase          │
│ 2. Monitoreo activo: primeras 24 horas                    │
│ 3. Rollback plan: si algo falla                            │
│ 4. Comunicación a usuarios: transparencia                  │
└─────────────────────────────────────────────────────────────┘
```

### Escenarios de Rollback

#### Rollback Rápido (< 15 min)
- Frontend sigue apuntando a Firebase
- Usuarios no sienten cambio
- Supabase puede limpiarse

#### Rollback Completo (Post-Cutover)
- Restaurar Firebase desde backup (GCS)
- Revertir app.js cambios
- Revalidar logins

---

## 📊 DISEÑO DE BASE DE DATOS POSTGRESQL

### Políticas de Diseño

1. **UUIDs**: Primary keys generados con `gen_random_uuid()`
2. **Trazabilidad**: Cada registro conserva `source_firestore_id`
3. **Auditoría**: `created_at`, `updated_at` automáticos
4. **Integridad**: FK con ON DELETE CASCADE/SET NULL según necesidad
5. **RLS**: Habilitado en todas las tablas públicas
6. **Sensibilidad**: Datos sensibles en schema privado

### Esquema SQL Completo

#### 1. Schema Privado (confidencial)

```sql
CREATE SCHEMA private;
GRANT ALL ON SCHEMA private TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM public;
```

#### 2. Extensiones Necesarias

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

#### 3. Helper Functions (Public)

```sql
-- Obtener rol del usuario actual
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::TEXT
  COALESCE (
    (auth.jwt() -> 'user_metadata' ->> 'role')::TEXT,
    'student'
  );
$$ LANGUAGE SQL STABLE;

-- Verificar si usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.current_user_role() IN ('admin', 'superadmin');
$$ LANGUAGE SQL STABLE;

-- Verificar si usuario es superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT public.current_user_role() = 'superadmin';
$$ LANGUAGE SQL STABLE;

-- Obtener ID del profile del usuario actual
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE;
```

#### 4. Tabla: public.profiles

```sql
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

-- RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger para updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

#### 5. Tabla: public.ranks

```sql
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
  ('Graduado', 5, 'Graduado');
```

#### 6. Tabla: public.spells

```sql
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
```

#### 7. Tabla: public.students

```sql
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

-- RLS para students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own record"
  ON public.students FOR SELECT
  USING (
    profile_id = public.current_profile_id()
    OR public.is_admin()
  );

CREATE POLICY "Students update own record"
  ON public.students FOR UPDATE
  USING (
    profile_id = public.current_profile_id()
    OR public.is_admin()
  )
  WITH CHECK (
    profile_id = public.current_profile_id()
    OR public.is_admin()
  );

CREATE POLICY "Admins can do anything"
  ON public.students FOR ALL
  USING (public.is_admin());
```

#### 8. Tabla: public.student_spells

```sql
CREATE TABLE public.student_spells (
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  spell_id UUID REFERENCES public.spells(id) ON DELETE CASCADE,
  learned BOOLEAN NOT NULL DEFAULT FALSE,
  source_spell_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, spell_id)
);

CREATE INDEX idx_student_spells_learned ON public.student_spells(learned);

-- RLS
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
  USING (public.is_admin());
```

#### 9. Tabla: public.infractions

```sql
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

-- RLS
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

CREATE POLICY "Admins manage infractions"
  ON public.infractions FOR ALL
  USING (public.is_admin());
```

#### 10. Tabla: public.bitacoras

```sql
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

-- RLS
ALTER TABLE public.bitacoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all bitacoras"
  ON public.bitacoras FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Students read bitacoras where they attend"
  ON public.bitacoras FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.bitacora_attendants ba
      JOIN public.students s ON ba.student_id = s.id
      WHERE ba.bitacora_id = id
      AND s.profile_id = public.current_profile_id()
    )
  );
```

#### 11. Tabla: public.bitacora_attendants

```sql
CREATE TABLE public.bitacora_attendants (
  bitacora_id UUID NOT NULL REFERENCES public.bitacoras(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  attendant_name TEXT NOT NULL,
  PRIMARY KEY (bitacora_id, attendant_name)
);

CREATE INDEX idx_bitacora_attendants_student ON public.bitacora_attendants(student_id);
```

#### 12. Tabla: public.bitacora_edit_history

```sql
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
```

#### 13. Tabla: public.potions

```sql
CREATE TABLE public.potions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  qty INT NOT NULL DEFAULT 0,
  original_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_potions_category ON public.potions(category);

-- RLS (todos leen, solo admin escribe)
ALTER TABLE public.potions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads potions"
  ON public.potions FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins write potions"
  ON public.potions FOR ALL
  USING (public.is_admin());
```

#### 14. Tabla: public.bitacora_potions

```sql
CREATE TABLE public.bitacora_potions (
  bitacora_id UUID NOT NULL REFERENCES public.bitacoras(id) ON DELETE CASCADE,
  potion_id TEXT NOT NULL REFERENCES public.potions(id) ON DELETE RESTRICT,
  qty INT DEFAULT 1,
  PRIMARY KEY (bitacora_id, potion_id)
);
```

#### 15. Tabla: public.access_logs

```sql
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

-- RLS: solo superadmin
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin reads logs"
  ON public.access_logs FOR SELECT
  USING (public.is_superadmin());
```

#### 16. Tabla: public.blocked_ips

```sql
CREATE TABLE public.blocked_ips (
  ip_hash TEXT PRIMARY KEY,
  blocked_at TIMESTAMPTZ,
  source_firestore_id TEXT UNIQUE,
  original_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo superadmin
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin reads"
  ON public.blocked_ips FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmin writes"
  ON public.blocked_ips FOR ALL
  USING (public.is_superadmin());
```

#### 17. Tabla: public.app_config

```sql
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: todos leen, solo admin escribe
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads config"
  ON public.app_config FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins write config"
  ON public.app_config FOR ALL
  USING (public.is_admin());

-- Insertar configuración inicial
INSERT INTO public.app_config (key, value) VALUES
  ('admin_note', '{"message": "Migración completada de Firebase"}'::jsonb);
```

#### 18. Tabla Privada: private.legacy_credentials

```sql
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

-- RLS: SIN acceso anon/authenticated
-- Solo accessible vía service_role en Edge Functions
ALTER TABLE private.legacy_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No access by default"
  ON private.legacy_credentials FOR ALL
  USING (FALSE);
```

#### 19. Tabla Privada: private.admin_legacy_credentials

```sql
CREATE TABLE private.admin_legacy_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  password_hash_sha256 TEXT NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  migrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: SIN acceso
ALTER TABLE private.admin_legacy_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No access by default"
  ON private.admin_legacy_credentials FOR ALL
  USING (FALSE);
```

#### 20. Triggers para updated_at

```sql
CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.potions
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.blocked_ips
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();
```

---

## 🔧 SCRIPTS DE MIGRACIÓN

### Estructura de Directorios

```
scripts/
├── migration/
│   ├── export-firestore.js
│   ├── validate-export.js
│   ├── import-supabase.js
│   ├── verify-supabase.js
│   ├── dry-run.js
│   ├── .env.example
│   └── utils/
│       ├── firebase-client.js
│       ├── supabase-client.js
│       └── hasher.js
├── migration_backups/
│   ├── 2026-06-12_14-30-45/
│   │   ├── alumnos.json
│   │   ├── bitacoras.json
│   │   ├── access_logs.json
│   │   ├── blocked_ips.json
│   │   ├── config.json
│   │   └── manifest.json
│   └── ...
└── rollback/
    ├── rollback-plan.md
    └── restore-firestore.sh
```

Los scripts completos están en secciones posteriores.

---

## 🚀 EDGE FUNCTIONS

### Edge Functions a Crear

1. **legacy-login** - Autenticación heredada para estudiantes
2. **admin-legacy-login** - Autenticación heredada para admin/superadmin
3. **check-blocked-ip** - Verificar si IP está bloqueada
4. **record-access-log** - Registrar acceso de IP
5. **validate-token** - Validar tokens JWT (opcional)

Detalles en secciones posteriores.

---

## 💻 ADAPTACIÓN DEL FRONTEND

### Cambios en app.js

#### Importaciones (cambiar de Firebase a Supabase)

```javascript
// ANTES (Firebase)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// DESPUÉS (Supabase)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
```

#### Inicialización (cambiar de Firebase a Supabase)

```javascript
// ANTES
const app = initializeApp(firebaseConfig);
let db = initializeFirestore(app, { ... });

// DESPUÉS
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);
```

#### Funciones Clave a Cambiar

- loadAllStudents() → loadAllStudents()
- openProfile() → openProfile()
- renderProfile() → renderProfile()
- saveStudent() → saveStudent()
- addAlumno() → addAlumno()
- deleteStudent() → deleteStudent()
- loadBitacoras() → loadBitacoras()
- saveBitacoraEntry() → saveBitacoraEntry()
- loadInventory() → loadInventory()
- studentLogin() → studentLogin() (con legacy-login)
- loginAdmin() → loginAdmin() (con admin-legacy-login)

#### Login Legacy para Usuarios Existentes

```javascript
async function studentLogin() {
  const username = norm(document.getElementById("loginUser").value);
  const password = document.getElementById("loginPwd").value;

  // Verificar bloqueo por IP
  const blocked = await checkBlockedIP();
  if (blocked) {
    toast("Tu IP está bloqueada. Contacta a un admin.", "error");
    return;
  }

  // Verificar rate limit local
  if (!loginAllowed()) {
    const remaining = loginLockRemaining();
    toast(`Bloqueado. Reinténtalo en ${remaining} min`, "error");
    return;
  }

  try {
    // Primero intentar Supabase Auth normal
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username}@medimagia.local`,
      password: password
    });

    if (data.user) {
      loggedInStudent = data.user.user_metadata.student_id;
      clearLoginLock();
      saveSession({
        username,
        studentId: data.user.id
      });
      showScreen("scProfile");
      return;
    }

    if (error) {
      // Si error es "Invalid login credentials", probar legacy-login
      if (error.message.includes("Invalid")) {
        const legacyResult = await window.legacyLogin(username, password);
        
        if (legacyResult.success) {
          loggedInStudent = legacyResult.studentId;
          clearLoginLock();
          saveSession({
            username,
            studentId: legacyResult.studentId
          });
          showScreen("scProfile");
          return;
        }
      }
      
      recordFailedLogin();
      toast("Credenciales incorrectas", "error");
      return;
    }
  } catch (err) {
    recordFailedLogin();
    console.error("Login error:", err);
    toast("Error al iniciar sesión", "error");
  }
}
```

### Cambios Estructurales

1. **IndexedDB**: Mantener para caché offline (compatible con Supabase)
2. **Session Storage**: Igual (localStorage sigue siendo válido)
3. **Rate Limiting**: Mantener en cliente + validar en servidor
4. **IP Blocking**: Delegar a Edge Function
5. **Sanitización**: Mantener igual (escHtml, safeAttr, safeStr)
6. **Timeouts**: Mantener igual (30 min inactividad)

---

## 🔐 SEGURIDAD Y VALIDACIÓN

### Principios de Seguridad Mantienen

✅ HTTPS forzado  
✅ Rate limiting (5 intentos = 15 min)  
✅ IP blocking  
✅ Sanitización de inputs  
✅ CSP headers (configurar en Supabase)  
✅ Session timeout (30 min)  
✅ No exponer service_role en frontend  

### Nuevas Capas de Seguridad

✅ **RLS**: Control granular por fila en PostgreSQL  
✅ **Edge Functions**: Validación en servidor  
✅ **JWT**: Tokens firmados por Supabase  
✅ **Hash Irreversible**: Datos de acceso hashed  
✅ **Credenciales Privadas**: Schema separado  

### Validaciones de Migración

1. **Integridad Referencial**: Todas las FK válidas
2. **Checksums**: Comparar antes/después
3. **Conteos**: Alumnos, bitácoras, pociones coinciden
4. **Unicidad**: No hay duplicados en migraciones
5. **Timestamps**: Conservar ISO8601
6. **Datos Sensibles**: Hashs nunca en claro

---

## 🔙 ROLLBACK Y RECUPERACIÓN

### Plan de Rollback Rápido

Si algo falla **antes** de cambiar el frontend:

```bash
# 1. Limpiar Supabase
psql $SUPABASE_DB_URL -f scripts/rollback/clean-supabase.sql

# 2. Frontend sigue en Firebase (sin cambios)
# → Usuario no nota nada

# 3. Rehacer exportación/importación
node scripts/migration/export-firestore.js
node scripts/migration/validate-export.js
node scripts/migration/dry-run.js
node scripts/migration/import-supabase.js
node scripts/migration/verify-supabase.js
```

### Plan de Rollback Completo

Si algo falla **después** de cambiar el frontend:

```bash
# 1. Cambiar frontend de vuelta a Firebase
# app.js: importar Firebase SDK
# SUPABASE_URL y SUPABASE_KEY → comentar

# 2. (Opcional) Restaurar Firebase desde backup
gsutil cp gs://medimagia-backup-firebase/* .

# 3. Revalidar login con usuarios de prueba
# → Usuario puede entrar de nuevo

# 4. Investigar qué falló en Supabase
# Revisar logs, checksums, etc.

# 5. Limpiar Supabase cuando esté seguro
psql $SUPABASE_DB_URL -f scripts/rollback/clean-supabase.sql
```

### Recovery Points

| Punto | Comando | Datos Seguros | Reversibilidad |
|-------|---------|---------------|----------------|
| Pre-export | `git status` | ✅ Firebase íntegro | Total |
| Post-export | `verify manifest.json` | ✅ JSON exportado | Total (restaurar desde JSON) |
| Post-validate | `validate-export.js OK` | ✅ Validación pasada | Total |
| Pre-import | `dry-run.js OK` | ✅ Sin cambios en DB | Total |
| Post-import | `verify-supabase.js` | ✅ Datos replicados | Parcial (limpiar tablas) |
| Post-frontend | Cambio app.js | ⚠️ Frontend apunta Supabase | Parcial (revertir app.js) |

---

## ✅ CHECKLIST DE PRODUCCIÓN

### Pre-Migración (1-2 días antes)

- [ ] Comunicar a usuarios: "Mantenimiento programado"
- [ ] Backup manual de Firebase (GCS o JSON)
- [ ] Crear proyecto Supabase en ambiente staging
- [ ] Pruebas de importación en staging
- [ ] Verificar credenciales .env
- [ ] Revisar Edge Functions en staging
- [ ] Preparar rollback scripts
- [ ] Comunicar a admins: procedimiento
- [ ] Prueba de login legacy en staging
- [ ] Verificar RLS en staging

### Día de Migración (Mañana)

- [ ] Ejecutar export-firestore.js
- [ ] Ejecutar validate-export.js (review reporte)
- [ ] Ejecutar dry-run.js (review cambios esperados)
- [ ] Comunicar a usuarios: "Iniciando migración"
- [ ] Ejecutar import-supabase.js
- [ ] Ejecutar verify-supabase.js (verificar 100%)
- [ ] Pruebas manuales: login, CRUD, roles
- [ ] Cambiar frontend (app.js + variables de entorno)
- [ ] Deploy frontend a producción
- [ ] Comunicar a usuarios: "Migración completada"

### Post-Migración (Primeras 24 horas)

- [ ] Monitoreo activo: logs, errores
- [ ] Pruebas con 5-10 usuarios reales
- [ ] Verificar que data coincide en Supabase
- [ ] Revisar access_logs en Supabase
- [ ] Pruebas de roles (student, admin, superadmin)
- [ ] Pruebas de edge cases (estudiante sin spells, etc)
- [ ] Asegurar que legacy-login funciona
- [ ] Asegurar que nuevos logins migran a auth.users
- [ ] Desabilitar acceso a Firebase (mantener como backup)
- [ ] Comunicar: "Migración exitosa"

---

## 📄 ENTREGABLES FINALES

Esta es la estructura completa que se entregará:

```
medimagia-ascensos/
├── MIGRATION_PLAN.md (este archivo)
├── scripts/migration/
│   ├── export-firestore.js
│   ├── validate-export.js
│   ├── import-supabase.js
│   ├── verify-supabase.js
│   ├── dry-run.js
│   ├── .env.example
│   └── utils/
│       ├── firebase-client.js
│       ├── supabase-client.js
│       └── hasher.js
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       ├── legacy-login/
│       │   └── index.ts
│       ├── admin-legacy-login/
│       │   └── index.ts
│       ├── check-blocked-ip/
│       │   └── index.ts
│       ├── record-access-log/
│       │   └── index.ts
│       └── deno.json
├── scripts/rollback/
│   ├── rollback-plan.md
│   └── clean-supabase.sql
└── README_MIGRATION.md
```

---

## 📌 PRÓXIMOS PASOS

1. ✅ **Leer este plan** (acabas de hacerlo)
2. ⏳ **Crear proyecto Supabase** (siguiente documento)
3. ⏳ **Implementar SQL schema** (siguiente documento)
4. ⏳ **Crear Edge Functions** (siguiente documento)
5. ⏳ **Implementar scripts Node.js** (siguiente documento)
6. ⏳ **Adaptar frontend** (siguiente documento)
7. ⏳ **Testing completo** (guía incluida)
8. ⏳ **Deployment** (guía incluida)

---

**Documento: MIGRATION_PLAN.md**  
**Versión: 1.0**  
**Estado: ✅ Listo para fase 1 (Preparación)**  
**Fecha creación: 2026-06-12**  
**Última actualización: 2026-06-12**
