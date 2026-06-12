# 📝 CAMBIOS REQUERIDOS EN app.js

**Firebase → Supabase Migration**

---

## 1. IMPORTACIONES

### ANTES (Firebase)

```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
         doc, getDoc, setDoc, getDocs, collection, deleteDoc, addDoc, updateDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
```

### DESPUÉS (Supabase)

```javascript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
```

---

## 2. INICIALIZACIÓN

### ANTES (Firebase)

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSyAFeEm4gJv8qcmhWeMnipcmk-Wpwi5I1G4",
  authDomain:        "medimagia-ascensos.firebaseapp.com",
  projectId:         "medimagia-ascensos",
  storageBucket:     "medimagia-ascensos.firebasestorage.app",
  messagingSenderId: "508815684624",
  appId:             "1:508815684624:web:988d28cf27268deedc4695"
};

const app = initializeApp(firebaseConfig);
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch {
  db = getFirestore(app);
}
```

### DESPUÉS (Supabase)

```javascript
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## 3. FUNCIONES CLAVE A CAMBIAR

### loadAllStudents()

#### ANTES (Firebase)

```javascript
async function loadAllStudents() {
  try {
    const snapshot = await getDocs(collection(db, "alumnos"));
    allStudents = {};
    allRanks = {};
    allCredentials = {};
    allInfractions = {};
    usernameIndex = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      allStudents[doc.id] = data;
      allRanks[doc.id] = data.currentRank;
      allCredentials[doc.id] = {
        username: data.username,
        passwordHash: data.studentPasswordHash
      };
      allInfractions[doc.id] = data.infractions || [];
      usernameIndex[norm(data.username)] = doc.id;
    });

    renderList();
  } catch (err) {
    console.error("Error loading students:", err);
    toast("Error al cargar alumnos", "error");
  }
}
```

#### DESPUÉS (Supabase)

```javascript
async function loadAllStudents() {
  try {
    const { data: students, error } = await supabase
      .from("students")
      .select(`
        *,
        student_spells(spell_id, learned),
        infractions(*)
      `);

    if (error) throw error;

    allStudents = {};
    allRanks = {};
    allInfractions = {};
    usernameIndex = {};

    for (const student of students) {
      allStudents[student.id] = {
        name: student.name,
        username: student.username,
        currentRank: student.current_rank,
        graduated: student.graduated,
        spells: {} // Llenar desde student_spells
      };

      // Procesar spells
      if (student.student_spells) {
        // Necesitar mapear spell_id a spell name
        // Ver getSpellsMap() más abajo
      }

      allRanks[student.id] = student.current_rank;
      allInfractions[student.id] = student.infractions || [];
      usernameIndex[norm(student.username)] = student.id;
    }

    renderList();
  } catch (err) {
    console.error("Error loading students:", err);
    toast("Error al cargar alumnos", "error");
  }
}
```

### studentLogin()

#### ANTES (Firebase)

```javascript
async function studentLogin() {
  const username = norm(document.getElementById("loginUser").value);
  const password = document.getElementById("loginPwd").value;

  if (!loginAllowed()) {
    toast(`Bloqueado ${loginLockRemaining()} min`, "error");
    return;
  }

  // Buscar alumno
  const studentName = Object.keys(allStudents).find(
    name => norm(allCredentials[name]?.username) === username
  );

  if (!studentName) {
    recordFailedLogin();
    toast("Credenciales incorrectas", "error");
    return;
  }

  // Verificar contraseña
  const expectedHash = await hashStudentPassword(password);
  const actualHash = allCredentials[studentName].passwordHash;

  if (expectedHash !== actualHash) {
    recordFailedLogin();
    toast("Credenciales incorrectas", "error");
    return;
  }

  // Éxito
  loggedInStudent = studentName;
  clearLoginLock();
  showScreen("scProfile");
  saveSession({ username });
}
```

#### DESPUÉS (Supabase)

```javascript
async function studentLogin() {
  const username = norm(document.getElementById("loginUser").value);
  const password = document.getElementById("loginPwd").value;

  if (!loginAllowed()) {
    const mins = loginLockRemaining();
    toast(`Bloqueado ${mins} min`, "error");
    return;
  }

  try {
    // Primero intentar Supabase Auth normal
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: `${username}@medimagia.local`,
      password: password
    });

    if (data?.user) {
      // Login exitoso en Supabase Auth
      loggedInStudent = data.user.user_metadata?.student_id;
      clearLoginLock();
      saveSession({
        username,
        userId: data.user.id,
        studentId: loggedInStudent
      });
      showScreen("scProfile");
      await loadAllStudents();
      return;
    }

    // Si falló, intentar legacy-login
    const legacyResponse = await fetch(`${SUPABASE_URL}/functions/v1/legacy-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const legacyResult = await legacyResponse.json();

    if (legacyResult.success) {
      // Usuario fue migrado, ahora reintentar auth normal
      recordFailedLogin("reset");
      toast("Usuario migrado exitosamente. Intenta de nuevo.", "info");
      return;
    }

    // Falló tanto Supabase Auth como legacy
    recordFailedLogin();
    toast("Credenciales incorrectas", "error");
  } catch (err) {
    console.error("Login error:", err);
    recordFailedLogin();
    toast("Error al iniciar sesión", "error");
  }
}
```

### saveStudent()

#### ANTES (Firebase)

```javascript
async function saveStudent() {
  const name = document.getElementById("inputName").value.trim();
  // ... validación ...

  const studentData = {
    name,
    username: makeUsername(name),
    currentRank,
    graduated,
    spells,
    infractions: allInfractions[loggedInStudent] || [],
    studentPasswordHash: currentPasswordHash,
    timestamp: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, "alumnos", loggedInStudent), studentData);
    toast("Cambios guardados", "success");
  } catch (err) {
    toast("Error al guardar", "error");
  }
}
```

#### DESPUÉS (Supabase)

```javascript
async function saveStudent() {
  const name = document.getElementById("inputName").value.trim();
  // ... validación ...

  try {
    // Actualizar estudiante
    const { error: updateError } = await supabase
      .from("students")
      .update({
        name,
        current_rank: currentRank,
        graduated: graduated
      })
      .eq("id", loggedInStudent);

    if (updateError) throw updateError;

    // Actualizar spells
    for (const [spellName, learned] of Object.entries(spells)) {
      const { data: spell } = await supabase
        .from("spells")
        .select("id")
        .eq("name", spellName)
        .single();

      if (spell) {
        await supabase
          .from("student_spells")
          .upsert({
            student_id: loggedInStudent,
            spell_id: spell.id,
            learned: learned
          }, { onConflict: "student_id,spell_id" });
      }
    }

    toast("Cambios guardados", "success");
  } catch (err) {
    console.error("Save error:", err);
    toast("Error al guardar", "error");
  }
}
```

### loadBitacoras()

#### ANTES (Firebase)

```javascript
async function loadBitacoras() {
  try {
    const snapshot = await getDocs(collection(db, "bitacoras"));
    allBitacoras = [];

    snapshot.forEach(doc => {
      allBitacoras.push({ id: doc.id, ...doc.data() });
    });

    renderBitacoras();
  } catch (err) {
    toast("Error al cargar bitácoras", "error");
  }
}
```

#### DESPUÉS (Supabase)

```javascript
async function loadBitacoras() {
  try {
    const { data: bitacoras, error } = await supabase
      .from("bitacoras")
      .select(`
        *,
        bitacora_attendants(*),
        bitacora_edit_history(*),
        bitacora_potions(*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    allBitacoras = bitacoras || [];
    renderBitacoras();
  } catch (err) {
    console.error("Bitacoras error:", err);
    toast("Error al cargar bitácoras", "error");
  }
}
```

### loadInventory()

#### ANTES (Firebase)

```javascript
async function loadInventory() {
  try {
    const docSnap = await getDoc(doc(db, "config", "inventory"));
    if (docSnap.exists()) {
      allInventory = docSnap.data();
    }
  } catch (err) {
    console.error("Error loading inventory:", err);
  }
}
```

#### DESPUÉS (Supabase)

```javascript
async function loadInventory() {
  try {
    const { data: potions, error } = await supabase
      .from("potions")
      .select("*");

    if (error) throw error;

    allInventory = {};
    for (const potion of potions) {
      allInventory[potion.id] = potion.qty;
    }
  } catch (err) {
    console.error("Inventory error:", err);
  }
}
```

---

## 4. NUEVAS FUNCIONES HELPER

### Mapear Spells por ID

```javascript
let spellsMap = {}; // id → name

async function initSpellsMap() {
  const { data: spells } = await supabase
    .from("spells")
    .select("id, name");

  spellsMap = {};
  for (const spell of spells) {
    spellsMap[spell.id] = spell.name;
  }
}
```

### Funciones de Utilidad

```javascript
// Obtener nombre de estudiante por ID
async function getStudentName(studentId) {
  const { data } = await supabase
    .from("students")
    .select("name")
    .eq("id", studentId)
    .single();

  return data?.name;
}

// Buscar estudiante por nombre
async function findStudentByName(name) {
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("name", name)
    .single();

  return data;
}

// Convertir spell IDs a nombres
function convertSpellIdsToNames(spellIds) {
  return spellIds.map(id => spellsMap[id] || id);
}
```

---

## 5. CONFIGURACIÓN DE AUTENTICACIÓN

### Mantener Session

```javascript
// Antes: localStorage
// Después: Supabase Auth session + localStorage hybrid

const SESSION_KEY = "mm_supabase_session";

function saveSupabaseSession(user) {
  if (!user) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    userId: user.id,
    email: user.email,
    role: user.user_metadata?.role,
    timestamp: Date.now()
  }));
}

async function restoreSupabaseSession() {
  const sessionData = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (!sessionData) return null;

  // Validar que la sesión de Supabase Auth siga activa
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

---

## 6. CAMBIOS ESTRUCTURALES

### Actualizar `tryAutoLogin()`

Cambiar para que use Supabase Auth:

```javascript
async function tryAutoLogin() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    loggedInStudent = user.user_metadata?.student_id;
    isAdmin = user.user_metadata?.role === "admin";
    isSuperAdmin = user.user_metadata?.role === "superadmin";
    
    if (isAdmin || isSuperAdmin) {
      showScreen("scAdmin");
    } else if (loggedInStudent) {
      showScreen("scProfile");
    }
    
    await loadAllStudents();
    return true;
  }
  
  return false;
}
```

### Actualizar `cerrarSesion()`

```javascript
async function cerrarSesion() {
  await supabase.auth.signOut();
  
  loggedInStudent = null;
  isAdmin = false;
  isSuperAdmin = false;
  rememberSession = false;
  
  localStorage.removeItem(SESSION_KEY);
  clearSession();
  
  showScreen("scSearch");
}
```

---

## 7. CAMBIOS MENORES

### Mantener Rate Limiting (igual)

```javascript
// Sin cambios - sigue siendo localStorage
const _LOCK_KEY = "mm_ll";
const _LOCK_MAX = 5;
const _LOCK_MS = 15 * 60 * 1000;
// ... resto de funciones igual
```

### Mantener Hashing (igual)

```javascript
// Sin cambios en SHA-256
async function hashStudentPassword(pwd) {
  // ... igual que antes
}
```

---

## 8. CHECKLIST DE CAMBIOS

- [ ] Importación de Supabase JS SDK
- [ ] Inicialización de cliente Supabase
- [ ] `loadAllStudents()` - Cambiar a queries Supabase
- [ ] `studentLogin()` - Agregar logic de legacy-login
- [ ] `loginAdmin()` - Similar a studentLogin
- [ ] `saveStudent()` - Cambiar a upsert
- [ ] `loadBitacoras()` - Cambiar a queries
- [ ] `saveBitacoraEntry()` - Cambiar a insert/update
- [ ] `loadInventory()` - Cambiar a queries
- [ ] `updatePotionQty()` - Cambiar a update
- [ ] `tryAutoLogin()` - Usar Supabase Auth
- [ ] `cerrarSesion()` - Usar Supabase signOut
- [ ] Inicializar spells map al cargar
- [ ] Agregar error handling con try/catch

---

## 9. TESTING RECOMENDADO

1. Login normal (usuario migrado)
2. Login legacy (usuario no migrado aún)
3. Crear nuevo alumno
4. Editar perfil
5. Agregar bitácora
6. Cambiar inventario
7. Admin functions
8. Logout

---

**Última actualización: 2026-06-12**
