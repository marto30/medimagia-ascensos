# 🔄 MIGRACIÓN FIREBASE → SUPABASE

**Medimagia Ascensos**  
**Versión: 1.0**  
**Fecha: 2026-06-12**  

---

## 📋 TABLA DE CONTENIDOS

1. [Requisitos Previos](#requisitos-previos)
2. [Preparación](#preparación)
3. [Fase 1: Exportar Datos](#fase-1-exportar-datos)
4. [Fase 2: Validar Exportación](#fase-2-validar-exportación)
5. [Fase 3: Dry-Run](#fase-3-dry-run)
6. [Fase 4: Importar en Supabase](#fase-4-importar-en-supabase)
7. [Fase 5: Verificar Integridad](#fase-5-verificar-integridad)
8. [Fase 6: Desplegar Edge Functions](#fase-6-desplegar-edge-functions)
9. [Fase 7: Cambiar Frontend](#fase-7-cambiar-frontend)
10. [Rollback si es Necesario](#rollback-si-es-necesario)

---

## ✅ REQUISITOS PREVIOS

### Software Requerido

- **Node.js** >= 16
- **npm** o **yarn**
- **git**
- **Supabase CLI** (opcional pero recomendado)

### Instalación

```bash
# Clonar repo (si no está clonado)
git clone https://github.com/marto30/medimagia-ascensos.git
cd medimagia-ascensos

# Instalar dependencias
npm install

# Instalar Supabase CLI (opcional)
npm install -g supabase
```

### Dependencias del Script

Instalar dependencias para los scripts de migración:

```bash
cd scripts/migration
npm install dotenv glob @supabase/supabase-js pg firebase-admin
cd ../..
```

---

## 🔧 PREPARACIÓN

### 1. Crear Proyecto Supabase

1. Ir a [https://app.supabase.com](https://app.supabase.com)
2. Click en "New project"
3. Nombre: `medimagia-ascensos`
4. Contraseña DB: generar segura (guardar en 1Password/bitwarden)
5. Region: Nearest to your users
6. Click "Create new project"
7. **Esperar 2-3 minutos** a que se cree la base de datos

### 2. Obtener Credenciales Supabase

1. En el dashboard de Supabase, ir a **Settings** → **API**
2. Copiar:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`
3. Para PostgreSQL directo:
   - Settings → Database → Connection info
   - Copiar connection string → `SUPABASE_DB_URL`

### 3. Configurar Variables de Entorno

```bash
cd scripts/migration
cp .env.example .env
```

Editar `.env`:

```env
# Firebase (obtener de Firebase Console)
FIREBASE_PROJECT_ID=medimagia-ascensos
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@medimagia-ascensos.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Supabase (obtener de Supabase Dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Configuración
MIGRATION_BACKUP_DIR=./migration_backups
VERBOSE=true
```

### 4. Crear y Ejecutar Migrations SQL

```bash
# Opción A: Usar Supabase CLI
supabase link --project-ref your-project-ref
supabase db push

# Opción B: Ejecutar SQL directamente en Supabase
# Ir a Supabase Dashboard → SQL Editor
# Pegar contenido de: supabase/migrations/001_initial_schema.sql
# Click "Run"
```

---

## 🚀 FASE 1: EXPORTAR DATOS

Exportar todos los datos de Firebase a JSON.

```bash
cd scripts/migration
node export-firestore.js
```

**Output esperado:**

```
======================================================================
  MEDIMAGIA ASCENSOS - EXPORTAR DATOS DE FIREBASE
======================================================================

📂 Backup directory: ./migration_backups/2026-06-12-14-30-45

📊 Iniciando exportación de colecciones...

📚 Exportando alumnos...
✅ Exportados 35 alumnos
📋 Exportando bitácoras...
✅ Exportadas 25 bitácoras
📊 Exportando access_logs...
✅ Exportados 1243 access_logs
🔒 Exportando blocked_ips...
✅ Exportadas 8 blocked_ips
⚙️  Exportando config...
✅ Config exportada

💾 Guardando archivos JSON...
   Guardado: alumnos.json (45.23 KB)
   Guardado: bitacoras.json (234.10 KB)
   Guardado: access_logs.json (156.78 KB)
   Guardado: blocked_ips.json (2.34 KB)
   Guardado: config.json (18.56 KB)
   Guardado: manifest.json (1.23 KB)

======================================================================
  ✅ EXPORTACIÓN COMPLETADA
======================================================================

📈 Resumen:
  • Alumnos exportados: 35
  • Bitácoras exportadas: 25
  • Access logs exportados: 1243
  • IPs bloqueadas exportadas: 8
  • Total hechizos: 30

📂 Archivos generados:
  ./migration_backups/2026-06-12-14-30-45/alumnos.json
  ./migration_backups/2026-06-12-14-30-45/bitacoras.json
  ./migration_backups/2026-06-12-14-30-45/access_logs.json
  ./migration_backups/2026-06-12-14-30-45/blocked_ips.json
  ./migration_backups/2026-06-12-14-30-45/config.json
  ./migration_backups/2026-06-12-14-30-45/manifest.json

⏭️  Próximo paso: node validate-export.js
```

✅ **Si ves esto: ÉXITO**

---

## ✔️ FASE 2: VALIDAR EXPORTACIÓN

Valida que los JSON sean válidos e íntegros.

```bash
node validate-export.js
```

**Output esperado:**

```
======================================================================
  MEDIMAGIA ASCENSOS - VALIDAR EXPORTACIÓN
======================================================================

📂 Validando backup: ./migration_backups/2026-06-12-14-30-45

📂 Cargando archivos JSON...
✅ Archivos cargados correctamente

🔍 Validando manifest...
✅ Manifest válido

📚 Validando alumnos...
✅ OK
   35 alumnos

📋 Validando bitácoras...
✅ OK
   25 bitácoras

⚙️  Validando config...
✅ OK
   Ranks: 4, Pociones: 33

📊 Validando access_logs...
✅ OK
   1243 logs

======================================================================
  ✅ VALIDACIÓN EXITOSA
======================================================================

✅ No hay errores críticos
⚠️  0 warnings

⏭️  Próximo paso: node dry-run.js
```

✅ **Si ves esto: ÉXITO**

Si hay ❌ **ERRORES**, investiga antes de continuar.

---

## 🏃 FASE 3: DRY-RUN

Simula la importación sin escribir en la BD.

```bash
node dry-run.js
```

**Output esperado:**

```
======================================================================
  MEDIMAGIA ASCENSOS - DRY-RUN (SIMULACIÓN)
======================================================================

📂 Simulando con datos de: ./migration_backups/2026-06-12-14-30-45

📂 Cargando archivos JSON...
✅ Datos cargados

🔄 Simulando importación...

📊 Ranks:
   • UPSERT ranks: 4 registros
   • UPSERT spells: 30 registros

👥 Alumnos:
   • UPSERT students: 35 registros
   • UPSERT student_spells: 1050 registros
   • UPSERT infractions: 12 registros

📋 Bitácoras:
   • UPSERT bitacoras: 25 registros
   • UPSERT bitacora_attendants: 47 registros
   • UPSERT bitacora_potions: 28 registros
   • UPSERT bitacora_edit_history: 13 registros

🧪 Inventario:
   • UPSERT potions: 33 registros

📊 Access Logs:
   • INSERT access_logs: 1243 registros

🔒 Blocked IPs:
   • UPSERT blocked_ips: 8 registros

======================================================================
  📈 RESUMEN DE SIMULACIÓN
======================================================================

✅ Total operaciones SQL: 2501
✅ Total registros a insertar/actualizar: 2501

⏭️  Próximo paso: node import-supabase.js
```

✅ **Si ves esto: ÉXITO**

---

## 🔒 FASE 4: IMPORTAR EN SUPABASE

**⚠️ PUNTO DE NO RETORNO - ESCRIBE EN LA BD**

Ejecuta:

```bash
node import-supabase.js
```

**Output esperado:**

```
======================================================================
  MEDIMAGIA ASCENSOS - IMPORTAR EN SUPABASE
======================================================================

📂 Importando desde: ./migration_backups/2026-06-12-14-30-45

📂 Cargando archivos JSON...
✅ Datos cargados

🔌 Conectando a Supabase...
✅ Conectado a Supabase

📊 Importando ranks...
✅ 4 ranks, 30 spells

👥 Importando estudiantes...
✅ 35 estudiantes, 1050 spells, 12 infracciones

📋 Importando bitácoras...
✅ 25 bitácoras, 47 attendants

🧪 Importando pociones...
✅ 33 pociones importadas

📊 Importando access_logs...
✅ 1243 access_logs importados

🔒 Importando blocked_ips...
✅ 8 blocked_ips importadas

======================================================================
  ✅ IMPORTACIÓN COMPLETADA
======================================================================

📈 Resumen de importación:
  ✅ Ranks: 4
  ✅ Spells: 30
  ✅ Estudiantes: 35
  ✅ Student spells: 1050
  ✅ Infracciones: 12
  ✅ Bitácoras: 25
  ✅ Attendants: 47
  ✅ Pociones: 33
  ✅ Access logs: 1243
  ✅ Blocked IPs: 8
  ✅ Legacy credentials: 35

⏭️  Próximo paso: node verify-supabase.js
```

✅ **Si ves esto: IMPORTACIÓN EXITOSA**

---

## ✅ FASE 5: VERIFICAR INTEGRIDAD

Compara Firebase vs Supabase.

```bash
node verify-supabase.js
```

**Output esperado:**

```
======================================================================
  MEDIMAGIA ASCENSOS - VERIFICAR INTEGRIDAD POST-IMPORTACIÓN
======================================================================

📂 Verificando con datos de: ./migration_backups/2026-06-12-14-30-45

📂 Cargando datos de Firebase...
✅ Datos de Firebase cargados

🔌 Conectando a Supabase...
✅ Conectado a Supabase

📂 Cargando datos de Supabase...
✅ Datos de Supabase cargados

🔍 EJECUTANDO VERIFICACIONES:

1️⃣  CONTEOS:
   ✅ Alumnos: 35 → 35
   ✅ Bitácoras: 25 → 25
   ✅ Access logs: 1243 → 1243
   ✅ Blocked IPs: 8 → 8
   ✅ Ranks: 4 → 4
   ✅ Spells: 30 → 30
   ✅ Pociones: 33 → 33

2️⃣  INTEGRIDAD DE SPELLS:
   ✅ 35/35 estudiantes con spells correctos

3️⃣  INTEGRIDAD DE INFRACCIONES:
   ✅ 35/35 estudiantes con infracciones correctas

4️⃣  INTEGRIDAD DE BITÁCORAS:
   ✅ 25 bitácoras importadas
   ✅ Integridad de bitácoras: OK

5️⃣  DETECTAR DUPLICADOS:
   ✅ Sin usernames duplicados
   ✅ Sin bitácoras duplicadas

6️⃣  VALIDAR CONFIGURACIÓN DE RANKS:
   ✅ Configuración de ranks OK

7️⃣  INTEGRIDAD DE DATOS (CHECKSUM):
   Firebase alumnos checksum: a1b2c3d4e5f6g7h8...
   Supabase students checksum: x9y8z7w6v5u4t3s2...
   ✅ Estructura de datos verificada

======================================================================
  ✅ VERIFICACIÓN EXITOSA - 100% INTEGRIDAD
======================================================================

📊 Resumen:
  ✅ Checks pasados: 12
  ❌ Checks fallidos: 0
  ⚠️  Problemas encontrados: 0

🎉 La migración fue EXITOSA. Todos los datos se replicaron correctamente.

⏭️  Próximo paso:
   1. Desplegar Edge Functions
   2. Cambiar frontend a Supabase
   3. Realizar pruebas con usuarios reales
```

✅ **Si ves esto: VERIFICACIÓN EXITOSA**

---

## 🚀 FASE 6: DESPLEGAR EDGE FUNCTIONS

Las Edge Functions manejan la autenticación legacy.

```bash
# Opción A: Usar Supabase CLI
supabase functions deploy legacy-login
supabase functions deploy admin-legacy-login

# Opción B: Deploy manual en Supabase Dashboard
# Functions → New → Pegar código
```

**Verificar deployment:**

```bash
supabase functions list
```

---

## 🌐 FASE 7: CAMBIAR FRONTEND

Cambiar `app.js` de Firebase a Supabase.

### Paso 1: Reemplazar importaciones

```javascript
// ANTES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

// DESPUÉS
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
```

### Paso 2: Reemplazar inicialización

```javascript
// ANTES
const app = initializeApp(firebaseConfig);
let db = initializeFirestore(app, {...});

// DESPUÉS
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);
```

### Paso 3: Actualizar funciones clave

Ver [MIGRATION_PLAN.md#adaptación-del-frontend](./MIGRATION_PLAN.md#adaptación-del-frontend) para detalles.

### Paso 4: Deploy

```bash
git add -A
git commit -m "Migración: Firebase → Supabase"
git push origin main
```

---

## 🔙 ROLLBACK SI ES NECESARIO

### Rollback Rápido (Antes de Cutover)

Si algo falla durante las fases 1-5:

```bash
# 1. Limpiar Supabase (si importó parcialmente)
# Ir a Supabase Dashboard → SQL Editor
# Ejecutar:
DELETE FROM public.students CASCADE;
DELETE FROM public.ranks;
# ... etc

# 2. Firebase sigue intacto (no se modificó)
# 3. Reintentar desde Phase 4
```

### Rollback Completo (Después de Cutover)

Si algo falla después de cambiar el frontend:

```bash
# 1. Cambiar app.js de vuelta a Firebase
# - Revertir importaciones
# - Revertir inicialización

git revert HEAD
# O manualmente cambiar las importaciones

# 2. Deploy frontend
git push origin main

# 3. Usuarios pueden entrar de nuevo con Firebase
```

### Recovery de Datos

Si necesitas restaurar Firebase desde backup:

```bash
# Google Cloud Storage (si tienes backup)
gsutil cp -r gs://medimagia-backup/* .

# O desde JSON de migración
# Puedes recrear Firebase desde los JSONs de export-firestore
```

---

## ⚠️ CHECKLIST FINAL

### Pre-Migración

- [ ] Backup manual de Firebase (descargar desde Console)
- [ ] Credenciales Supabase confirmadas
- [ ] Proyecto Supabase creado y accesible
- [ ] Schema SQL ejecutado sin errores
- [ ] Variables .env configuradas
- [ ] Node.js >= 16 instalado
- [ ] Dependencias instaladas (`npm install`)

### Durante Migración

- [ ] `export-firestore.js` completó exitosamente
- [ ] `validate-export.js` pasó sin errores
- [ ] `dry-run.js` mostró números realistas
- [ ] `import-supabase.js` completó sin errores críticos
- [ ] `verify-supabase.js` mostró 100% integridad
- [ ] Checksums coinciden (aproximadamente)
- [ ] Firebase sigue intacto

### Post-Migración

- [ ] Edge Functions desplegadas
- [ ] Frontend cambiado a Supabase
- [ ] 5-10 usuarios pueden entrar
- [ ] Legacy login funciona
- [ ] Nuevo login funciona
- [ ] CRUD operaciones funcionan
- [ ] Roles (student, admin, superadmin) funcionan
- [ ] Sin errores en Supabase logs
- [ ] Sin pérdida de datos

### Después de 24h

- [ ] Sin issues reportados por usuarios
- [ ] Supabase performance OK
- [ ] Firebase puede ser deshabilitado (opcional)

---

## 📚 DOCUMENTACIÓN RELACIONADA

- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) - Plan técnico detallado
- [CONTEXTO_APP.md](./CONTEXTO_APP.md) - Contexto de la aplicación
- [supabase/migrations/001_initial_schema.sql](./supabase/migrations/001_initial_schema.sql) - Schema PostgreSQL

---

## 📞 SOPORTE

Si algo falla:

1. **Revisa los logs** en la consola
2. **Revisa manifest.json** para datos esperados
3. **Revisa Supabase Dashboard** → Logs para errores de BD
4. **Haz rollback** si es necesario
5. **Reintenta** desde la fase donde se detuvo

---

**Última actualización: 2026-06-12**  
**Migración: Firebase Firestore → PostgreSQL/Supabase**
