# 🚨 ALERTA DE SEGURIDAD - Credenciales Comprometidas

**Fecha:** 2026-06-12  
**Criticidad:** 🔴 CRÍTICA

## Problema Identificado

Durante la migración, el archivo `scripts/migration/.env` fue accidentalmente commiteado al repositorio con credenciales **en texto plano**.

### Credenciales Expuestas:
- ❌ Firebase Private Key (completa, irreversible)
- ❌ Supabase Service Role Key (acceso total a la BD)
- ❌ Supabase Database URL con contraseña
- ❌ Contraseña de BD: `QhpXkweBVMLrjYyJ`

## Acciones Tomadas

✅ **Eliminadas del repositorio:**
1. `scripts/migration/.env` removido del historial de git
2. `.gitignore` creado para prevenir futuras exposiciones
3. Git history reescrito (filter-branch aplicado)

## Acciones REQUERIDAS INMEDIATAMENTE

⚠️ **Si el repositorio es público o fue pushed a GitHub:**

### 1. Firebase (URGENTE)
```
1. Ve a: https://console.firebase.google.com/project/{id}/settings/serviceaccounts
2. Haz clic en "Generate New Private Key"
3. Elimina la clave antigua
4. Descarga la nueva clave
5. Actualiza las variables de entorno localmente
```

### 2. Supabase (URGENTE)
```
1. Ve a: https://app.supabase.com/project/{id}/settings/api
2. Revoca los siguientes tokens:
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
3. Genera nuevas claves
4. Cambia la contraseña de la BD:
   - User: postgres
   - Nueva contraseña: [generar aleatoria fuerte]
5. Actualiza SUPABASE_DB_URL con la nueva contraseña
```

### 3. Git History
```bash
# Si aún no has hecho push:
git push -f origin main

# Si ya hiciste push:
# GitHub almacena en caché - contacta a GitHub Support para purgar
# Referencias: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
```

## Cómo Prevenir Esto en el Futuro

### ✅ Proceso Correcto para Credenciales:

1. **Crear `.env.example`** sin valores sensibles:
```bash
# scripts/migration/.env.example
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SUPABASE_DB_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
```

2. **Agregar a `.gitignore`:**
```bash
.env
.env.local
.env.*.local
credentials.json
*.key
```

3. **Documentar en README:**
```markdown
## Setup Local

1. Copia .env.example a .env
2. Rellena tus credenciales (nunca commiteables)
3. Ejecuta: source .env
```

4. **Pre-commit hook** (opcional pero recomendado):
```bash
#!/bin/bash
# .git/hooks/pre-commit
if git diff --cached | grep -E "PRIVATE_KEY|password.*=" > /dev/null; then
  echo "⛔ Error: Credenciales en staging area"
  exit 1
fi
```

## Archivos Afectados

| Archivo | Estado | Acción |
|---------|--------|--------|
| `scripts/migration/.env` | ❌ Eliminado | Removido del repo y historial |
| `scripts/migration/.env.example` | ✅ Presente | Mantiene estructura sin credenciales |
| `.gitignore` | ✅ Creado | Protege futuras credenciales |

## Validación

Ejecuta estos comandos para verificar que no hay credenciales:

```bash
# Buscar en el historial actual
git log -p --all | grep -i "PRIVATE_KEY\|password" | grep -v ".gitignore"

# Buscar en archivos tracked
git ls-files | xargs grep -l "PRIVATE_KEY\|password"

# Verificar .gitignore
cat .gitignore | grep -E "\.env|credentials|\.key"
```

## Referencias

- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api/service-accounts)
- [Supabase Security](https://supabase.com/docs/learn/security)
- [OWASP: Secrets Management](https://owasp.org/www-community/attacks/API_key_leakage)

---

**Reviewed:** 2026-06-12  
**Status:** ✅ Limpiado localmente | ⚠️ Requiere rotación de credenciales
