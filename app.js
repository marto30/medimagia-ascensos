import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// =====================================================================
//  SUPABASE CONFIG
// =====================================================================
const SUPABASE_URL = "https://znuleryreishpfmtvhby.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudWxlcnlyZWlzaHBmbXR2aGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTA0NDEsImV4cCI6MjA5Njc4NjQ0MX0.1UE_DlCo23MhgMfFV9L0419haTMq2BSU971MeHmqGCw";
const SUPABASE_SERVICE_FUNCTION_URL = "https://znuleryreishpfmtvhby.supabase.co/functions/v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================================
//  CONSTANTS
// =====================================================================
const ASCENSO_MISSING = 2; // hechizos que pueden faltar para ser elegible al ascenso
let RANKS_ORDER   = ["Aprendiz","Principiante","Intermedio","Avanzado"];
let RANKS = {
  Aprendiz:     ["Bullapure","Férula","Osseus Reparo","Tergeo","Examino","Vitae Expulso","Leniter","Sommnium"],
  Principiante: ["Anapneo","Anesthetica","Brackium Emendo","Vitalis","Tranquillitas","Melis Sanitas","Tergiverso"],
  Intermedio:   ["Vulnera Curatio","Ennervate","Invenio Cardium","Restitutio Mobilitas","Medimend","Mind Recupero","Solatio"],
  Avanzado:     ["Finite Incantatem","Confractus","Amicientes","Reparifarge","Panacea","Zanarem","Suturae","Revitalizare"]
};
const RANK_PALETTE_SIZE = 6;
// Clase de color por posición — permite que rangos nuevos (creados desde el panel) tengan estilo sin CSS por nombre
function rankClass(prefix, rankName) {
  if (rankName === "Graduado") return "rk-Graduado";
  const idx = RANKS_ORDER.indexOf(rankName);
  return `${prefix}-i${(idx < 0 ? 0 : idx) % RANK_PALETTE_SIZE}`;
}


// =====================================================================
//  HELPERS
// =====================================================================
function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim(); }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function ipDocId(ip)   { return ip.replace(/\./g, "-"); }
function uaSummary(ua) {
  if (!ua) return "—";
  if (/Edg\//.test(ua))           return "Edge";
  if (/Chrome\//.test(ua))        return "Chrome";
  if (/Firefox\//.test(ua))       return "Firefox";
  if (/Safari\//.test(ua))        return "Safari";
  if (/bot|crawl|spider/i.test(ua)) return "Bot";
  return ua.substring(0, 35) + "…";
}
function allSpells() { return Object.values(RANKS).flat(); }
function getRkPct(sp, rk) {
  const l = RANKS[rk];
  const d = l.filter(s => sp[s]).length;
  return { done: d, total: l.length, pct: Math.round(d / l.length * 100) };
}
function calcCorrectRank(sp) {
  let rank = RANKS_ORDER[0];
  for (let i = 0; i < RANKS_ORDER.length - 1; i++) {
    const missing = RANKS[RANKS_ORDER[i]].filter(s => !sp[s]).length;
    if (missing <= ASCENSO_MISSING) rank = RANKS_ORDER[i + 1];
    else break;
  }
  return rank;
}
function calcRankLegacy(sp) { return calcCorrectRank(sp); }
function getStudentRank(name) {
  return allRanks[name] || RANKS_ORDER[0];
}
function canAscend(sp, rank) {
  const idx = RANKS_ORDER.indexOf(rank);
  if (idx >= RANKS_ORDER.length - 1) return false;
  return RANKS[rank].filter(s => !sp[s]).length <= ASCENSO_MISSING;
}
function safeStr(n)  { return n.replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
function docId(name) { return name.replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_]/g,"X"); }
// Sanea cualquier texto para usarlo como id de elemento DOM (sin comillas ni símbolos)
function domKey(s)   { return String(s).replace(/[^a-zA-Z0-9_-]/g, "_"); }
// Escapa texto para inserción segura en innerHTML
function escHtml(v)  {
  return String(v ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
// Escapa para uso simultáneo en atributo HTML + literal JS dentro de onclick="fn('...')"
//
// ⚠️ SOLO para código JS dentro de un atributo (onclick, onchange, onkeydown).
// Añade una barra invertida antes de las comillas simples, así que en un
// atributo normal (value=, data-, id=, title=) el valor llegaría corrupto:
// "Colin O'Sullivan" se leería como "Colin O\'Sullivan" y no coincidiría con
// ningún alumno. Para esos casos usa escHtml(); para ids, domKey().
function safeAttr(n) {
  return String(n ?? "")
    .replace(/\\/g,"\\\\").replace(/'/g,"\\'")
    .replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// =====================================================================
//  SHA-256  (Web Crypto API — sin dependencias)
// =====================================================================
function _s(a,b,c){ return atob(a)+atob(b)+atob(c); }

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(_s("bWVkaW1hZ2lh","X3Yx","Xw==") + str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}
async function hashIP(ip) {
  const buf = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(_s("bWVkaW1hZ2lh","X2lwX3Yy","Xw==") + ip));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}
async function hashStudentPwd(pwd) {
  const buf = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(_s("bWVkaW1hZ2lh","X3N0dWRlbnRf","djFf") + pwd));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2,"0")).join("");
}
function generatePassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr   = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join("");
}
function makeUsername(name) {
  return name.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim().replace(/\s+/g, ".");
}

// Clave con la que se construye el email de acceso: ignora puntos y
// símbolos, así que "colin.o.sullivan" y "colin.osullivan" son la MISMA
// cuenta. Hay que tenerlo en cuenta al generar usuarios o dos medimagos
// acabarían compartiendo login.
function loginKey(username) {
  return String(username || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Genera un username a partir del nombre, añadiendo un sufijo numérico si
// ya existe otro alumno con ese username o si chocaría su email de acceso.
function generateUniqueUsername(name) {
  const base = makeUsername(name);
  const tomados = new Set();
  for (const [u, n] of Object.entries(usernameIndex)) {
    if (n !== name) tomados.add(loginKey(u));
  }

  let username = base;
  let suffix   = 0;
  while (
    (usernameIndex[username] && usernameIndex[username] !== name) ||
    tomados.has(loginKey(username))
  ) {
    suffix++;
    username = base + suffix;
  }
  return username;
}

function authEmailForUsername(username) {
  return `${String(username || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "")}@medimagia.test`;
}

// =====================================================================
//  SEGURIDAD — HTTPS · Rate limit · Session timeout
// =====================================================================
// Forzar HTTPS (excepto localhost)
if (location.protocol !== "https:" && !["localhost","127.0.0.1"].includes(location.hostname)) {
  location.replace("https:" + location.href.slice(location.protocol.length));
}

// Rate limiting para login (5 intentos, bloqueo 15 min)
// key: "mm_ll" = admin · "mm_sl" = alumnos (contadores independientes)
const _LOCK_KEY  = "mm_ll";
const _LOCK_MAX  = 5;
const _LOCK_MS   = 15 * 60 * 1000;
function loginAllowed(key = _LOCK_KEY) {
  try {
    const d = JSON.parse(localStorage.getItem(key) || "{}");
    if (!d.since || Date.now() - d.since > _LOCK_MS) return true;
    return (d.count || 0) < _LOCK_MAX;
  } catch { return true; }
}
function loginLockRemaining(key = _LOCK_KEY) {
  try {
    const d = JSON.parse(localStorage.getItem(key) || "{}");
    if (!d.since || Date.now() - d.since > _LOCK_MS) return 0;
    return (d.count || 0) >= _LOCK_MAX ? Math.ceil((_LOCK_MS - (Date.now() - d.since)) / 60000) : 0;
  } catch { return 0; }
}
function recordFailedLogin(key = _LOCK_KEY) {
  try {
    const d = JSON.parse(localStorage.getItem(key) || "{}");
    const since = d.since && Date.now() - d.since <= _LOCK_MS ? d.since : Date.now();
    localStorage.setItem(key, JSON.stringify({ count: (d.count || 0) + 1, since }));
  } catch {}
}
function clearLoginLock(key = _LOCK_KEY) {
  try { localStorage.removeItem(key); } catch {}
}

// Session timeout: cierre automático por inactividad (30 min) — salvo "mantener sesión"
const _SESSION_MS = 30 * 60 * 1000;
let _sessionTimer = null;
let rememberSession = false;   // true cuando hay sesión persistente activa
function resetSessionTimer() {
  if (!isAdmin) return;
  clearTimeout(_sessionTimer);
  if (rememberSession) return; // sesión recordada: no cerrar por inactividad
  _sessionTimer = setTimeout(() => {
    cerrarSesion();
    toast("Sesión cerrada por inactividad", "error");
  }, _SESSION_MS);
}
["click","keydown","touchstart"].forEach(ev =>
  document.addEventListener(ev, resetSessionTimer, { passive: true }));

// =====================================================================
//  SESIÓN PERSISTENTE  ("mantener sesión iniciada")
//  Guarda solo el hash ya cifrado (nunca la contraseña en claro), con
//  caducidad. Se revalida contra la base de datos en cada carga, de modo
//  que cambiar la contraseña invalida las sesiones guardadas.
// =====================================================================
const _SESSION_KEY = "mm_session";
const _SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 días
function saveSession(data) {
  try {
    localStorage.setItem(_SESSION_KEY, JSON.stringify({ ...data, ts: Date.now() }));
    rememberSession = true;
  } catch {}
}
function loadSession() {
  try {
    const d = JSON.parse(localStorage.getItem(_SESSION_KEY) || "null");
    if (!d || !d.ts || Date.now() - d.ts > _SESSION_TTL) { clearSession(); return null; }
    rememberSession = true;
    return d;
  } catch { return null; }
}
function clearSession() {
  rememberSession = false;
  try { localStorage.removeItem(_SESSION_KEY); } catch {}
}

// =====================================================================
//  DEBOUNCE — evita re-renderizar listas completas en cada pulsación
// =====================================================================
function debounce(fn, ms = 160) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}
// Versiones debounced para los oninput de los buscadores (definidas como
// arrows para que resuelvan la función real en el momento de la llamada)
window.renderListD           = debounce(() => renderList());
window.filterBitacorasD      = debounce(() => window.filterBitacoras());
window.filterPersonasD       = debounce(() => window.filterPersonas());
window.filterAttendantsD     = debounce(() => window.filterAttendants(), 120);
window.filterEditAttendantsD = debounce(() => window.filterEditAttendants(), 120);

// =====================================================================
//  TOAST
// =====================================================================
function toast(msg, type = "") {
  const wrap = document.getElementById("toastWrap");
  const el   = document.createElement("div");
  el.className = "toast" + (type ? " t" + type : "");
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 320);
  }, 2800);
}

// =====================================================================
//  CONFIRM MODAL
// =====================================================================
let _modalResolve = null;
function showModal(title, body, confirmLabel = "Confirmar", btnCls = "danger") {
  document.getElementById("modalTitle").textContent    = title;
  document.getElementById("modalBody").textContent     = body;
  const btn = document.getElementById("modalConfirmBtn");
  btn.textContent = confirmLabel;
  btn.className   = "btn sm " + btnCls;
  document.getElementById("confirmModal").classList.add("show");
  return new Promise(r => { _modalResolve = r; });
}
window.closeModal = function(val) {
  document.getElementById("confirmModal").classList.remove("show");
  if (_modalResolve) { _modalResolve(val); _modalResolve = null; }
};
document.getElementById("confirmModal")
  .addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(false); });
document.getElementById("editBitacoraModal")
  .addEventListener("click", e => { if (e.target === e.currentTarget) cancelEditBitacora(); });

// =====================================================================
//  FIREBASE — alumnos
// =====================================================================
let allStudents    = {};
let allGraduated   = {};
let allRanks       = {};   // name → stored rank (manual, set by admin)
let allCredentials = {};   // name → { username, passwordHash }
let allInfractions = {};   // name → [{ reason, date }]
let usernameIndex  = {};   // lowercase_username → name
window.isAdmin        = false;
window.isSuperAdmin   = false;
window.loggedInStudent = null;
window.adminPwdHash   = null;
window.superAdminHash = null;
let visitorIP      = null;
let allInventory   = {};   // potion_id → qty (número)
let studentIdMap   = {};   // name → student UUID
let allAttendance  = [];   // [{id, session_date, title, records: [{student_id, attended}]}]

// Catálogo completo de pociones
const POTIONS_CATALOG = [
  { id: "pocion_pimentonica", name: "Poción Pimentónica", category: "Pociones", desc: "Tratar fiebres, gripes, pérdidas de temperatura corporal (el paciente entra en calor y emite vapor por las orejas)." },
  { id: "pocion_purgante", name: "Poción Purgante", category: "Pociones", desc: "Tratar intoxicaciones o envenenamiento (por ejemplo, estomacales)." },
  { id: "pocion_hipotusiva", name: "Poción Hipotusiva", category: "Pociones", desc: "Tratar episodios de ataques de hipo y tos." },
  { id: "pocion_despertare", name: "Poción Despertare", category: "Pociones", desc: "Despertar pacientes inconscientes/dormidos (se inhala)." },
  { id: "pocion_herbovitalizante", name: "Poción Herbovitalizante", category: "Pociones", desc: "Tratar heridas leves (como cortes o abrasiones), reconstituyente/energizante." },
  { id: "pocion_reabastecedora", name: "Poción Reabastecedora de Sangre", category: "Pociones", desc: "Tratar pérdidas de sangre significativas en el paciente." },
  { id: "pocion_crecehuesos", name: "Poción Crecehuesos", category: "Pociones", desc: "Tratar huesos con fracturas moderadas y graves." },
  { id: "pocion_antiparalis", name: "Poción antiparálisis", category: "Pociones", desc: "Elimina y cura los efectos de la parálisis." },
  { id: "pocion_conciencia", name: "Poción restauradora de la conciencia", category: "Pociones", desc: "Restaura la conciencia de uno." },
  { id: "pocion_foruniculos", name: "Poción curadora de forúnculos", category: "Pociones", desc: "Sencilla poción para curar forúnculos." },
  { id: "pocion_crisopea", name: "Poción para revertir la crisopea", category: "Pociones", desc: "Revierte los efectos de la Crisopea." },
  { id: "pocima_dormir", name: "Pócima para dormir", category: "Pociones", desc: "Permite que al consumidor concilie el sueño de forma instantánea." },
  { id: "pocion_laxante", name: "Poción laxante", category: "Pociones", desc: "Una poción que más bien se parece a un laxante." },
  { id: "pocion_sueño_tranquilo", name: "Poción de sueño sin sueños", category: "Pociones", desc: "Una poción que induce el sueño y evita que se tengan pesadillas." },
  { id: "pocion_tos", name: "Poción para la tos", category: "Pociones", desc: "Es una poción que cura la irritación de la garganta." },
  { id: "filtro_paz", name: "Filtro de Paz", category: "Filtros", desc: "Tratar la ansiedad y el nerviosismo, generando un sentimiento de paz." },
  { id: "filtro_mandrágora", name: "Filtro restaurativo de mandrágora", category: "Filtros", desc: "Devuelve la movilidad a aquellos que han sido petrificados." },
  { id: "esencia_dictamo", name: "Esencia de díctamo", category: "Esencias", desc: "Tratar heridas abiertas, externas e internas, leves y graves. Rara vez dejan cicatriz." },
  { id: "esencia_murtlap", name: "Esencia de Murtlap", category: "Esencias", desc: "Tratar cortes y abrasiones. Puede calmar el dolor." },
  { id: "ungüento_quemaduras", name: "Ungüento para quemaduras", category: "Ungüentos", desc: "Tratar quemaduras de primer a tercer grado." },
  { id: "ungüento_desinfectante", name: "Ungüento desinfectante", category: "Ungüentos", desc: "Desinfectar cualquier tipo de herida." },
  { id: "antidoto_venenos", name: "Antídoto para venenos comunes", category: "Antídotos", desc: "Tratar envenenamientos comunes (plantas, pociones, ciertas criaturas)." },
  { id: "antidoto_acromántula", name: "Antídoto para veneno de acromántula", category: "Antídotos", desc: "Tratar envenenamientos por mordeduras o ácido de acromántula." },
  { id: "antidoto_comezón", name: "Antídoto contra la comezón bucal", category: "Antídotos", desc: "Una poción con el poder de curar la picazón en la boca." },
  { id: "antidoto_billywig", name: "Antídoto para las picaduras de billywig", category: "Antídotos", desc: "Contrarresta los efectos de la picadura de un billywig." },
  { id: "balsamo_raiz", name: "Bálsamo de raíz amarga ardiente", category: "Bálsamos", desc: "Posiblemente un tipo de bálsamo tranquilizador cuyo ingrediente principal es la raíz amarga." },
  { id: "balsamo_asclepias", name: "Bálsamo de Asclepias tuberosa", category: "Bálsamos", desc: "Un bálsamo usada para aliviar el dolor." },
  { id: "emplasto_plata", name: "Emplasto de polvo de plata y de díctamo", category: "Emplastos", desc: "Se usa para curar las mordeduras y garrazos producidas por hombres lobos." },
  { id: "solucion_cabeza", name: "Solución para el dolor de cabeza", category: "Soluciones", desc: "Tratar dolores de cabeza leves y moderados, indistintamente de su origen mágico o no." },
  { id: "solucion_limpiadora", name: "Solución limpiadora", category: "Soluciones", desc: "Pociones diseñadas para propósitos de limpieza." },
  { id: "bezoar", name: "Bezoar", category: "Otros", desc: "Tratar intoxicaciones y envenenamientos leves." },
  { id: "chocolate", name: "Chocolate", category: "Otros", desc: "Se usa para calmar algunas situaciones o para endulzar la vida." },
  { id: "piruletas", name: "Piruletas", category: "Otros", desc: "Ayuda a los mas pequeños a estar bien después de una intervención." }
];

async function loadAdminConfig() {
  try {
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "admin_config");
    if (data && data.length > 0 && data[0]?.value) {
      adminPwdHash   = data[0].value.passwordHash || null;
      superAdminHash = data[0].value.superPasswordHash || null;
    }
  } catch {
    adminPwdHash = null;
  }
}

async function loadRanksConfig() {
  try {
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "ranks_config");
    if (data && data.length > 0 && data[0]?.value) {
      const { order, spells } = data[0].value;
      if (Array.isArray(order) && order.length && spells) {
        RANKS_ORDER = order;
        RANKS = spells;
      }
    }
  } catch { /* se mantienen los rangos por defecto */ }
}

async function saveRanksConfig() {
  const { error } = await supabase
    .from("app_config")
    .upsert({ key: "ranks_config", value: { order: RANKS_ORDER, spells: RANKS } }, { onConflict: "key" });
  if (error) throw error;
}

// =====================================================================
//  ADMIN — GESTIÓN DE RANGOS Y HECHIZOS
// =====================================================================
function renderRankSelector() {
  const wrap = document.getElementById("rankSelector");
  if (!wrap) return;
  wrap.innerHTML = RANKS_ORDER.map(rk =>
    `<div class="rank-opt" data-rank="${escHtml(rk)}" onclick="selectRankOpt(this)">${escHtml(rk)}</div>`
  ).join("");
}

function renderRanksEditor() {
  const wrap = document.getElementById("ranksEditor");
  if (!wrap) return;
  document.getElementById("rankErr").style.display = "none";
  wrap.innerHTML = RANKS_ORDER.map((rk, i) => {
    const spells = RANKS[rk] || [];
    const chips = spells.length
      ? spells.map(s => `<span class="spell-chip">${escHtml(s)}
          <button type="button" onclick="removeSpellFromRank('${safeAttr(rk)}','${safeAttr(s)}')" title="Quitar hechizo">×</button>
        </span>`).join("")
      : '<span class="rank-edit-empty">Sin hechizos asignados</span>';
    return `<div class="rank-edit-block">
      <div class="rank-edit-head">
        <span class="rank-badge ${rankClass("rk", rk)}">${escHtml(rk)}</span>
        <span class="rank-edit-count">${spells.length} hechizo${spells.length !== 1 ? "s" : ""}</span>
        <div class="rank-edit-actions">
          <button type="button" class="btn sm ghost" ${i === 0 ? "disabled" : ""} onclick="moveRank(${i},-1)" title="Subir">↑</button>
          <button type="button" class="btn sm ghost" ${i === RANKS_ORDER.length - 1 ? "disabled" : ""} onclick="moveRank(${i},1)" title="Bajar">↓</button>
          <button type="button" class="btn sm danger" onclick="deleteRank('${safeAttr(rk)}')">Eliminar rango</button>
        </div>
      </div>
      <div class="rank-spell-chips">${chips}</div>
      <div class="rank-add-spell">
        <input type="text" id="newSpell_${i}" placeholder="Nombre del nuevo hechizo" maxlength="60"
               onkeydown="if(event.key==='Enter')addSpellToRank('${safeAttr(rk)}',${i})"/>
        <button type="button" class="btn sm" onclick="addSpellToRank('${safeAttr(rk)}',${i})">+ Añadir hechizo</button>
      </div>
    </div>`;
  }).join("");
}

window.addSpellToRank = function(rank, inputIdx) {
  const input = document.getElementById(`newSpell_${inputIdx}`);
  const errEl = document.getElementById("rankErr");
  errEl.style.display = "none";
  const name = (input.value || "").trim();
  if (!name) return;
  if (name.length > 60) {
    errEl.textContent = "El nombre del hechizo no puede superar los 60 caracteres.";
    errEl.style.display = "block";
    return;
  }
  if (allSpells().some(s => norm(s) === norm(name))) {
    errEl.textContent = `Ya existe un hechizo llamado "${name}".`;
    errEl.style.display = "block";
    return;
  }
  RANKS[rank] = [...(RANKS[rank] || []), name];
  renderRanksEditor();
};

window.removeSpellFromRank = function(rank, spell) {
  RANKS[rank] = (RANKS[rank] || []).filter(s => s !== spell);
  renderRanksEditor();
};

window.moveRank = function(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= RANKS_ORDER.length) return;
  [RANKS_ORDER[idx], RANKS_ORDER[j]] = [RANKS_ORDER[j], RANKS_ORDER[idx]];
  renderRanksEditor();
};

window.deleteRank = async function(rank) {
  if (RANKS_ORDER.length <= 1) {
    toast("Debe quedar al menos un rango.", "error");
    return;
  }
  const inUse = Object.values(allRanks).some(r => r === rank);
  if (inUse) {
    toast(`No se puede eliminar "${rank}": hay alumnos actualmente en ese rango.`, "error");
    return;
  }
  const ok = await showModal(
    "Eliminar rango",
    `¿Eliminar el rango "${rank}" y sus ${(RANKS[rank] || []).length} hechizos? Esta acción no se puede deshacer.`,
    "Eliminar", "danger"
  );
  if (!ok) return;
  RANKS_ORDER = RANKS_ORDER.filter(r => r !== rank);
  delete RANKS[rank];
  renderRanksEditor();
  toast(`Rango "${rank}" eliminado. Recuerda guardar los cambios.`);
};

window.addNewRank = function() {
  const input = document.getElementById("newRankName");
  const errEl = document.getElementById("rankErr");
  errEl.style.display = "none";
  const name = (input.value || "").trim();
  if (!name) return;
  if (name.length > 40) {
    errEl.textContent = "El nombre del rango no puede superar los 40 caracteres.";
    errEl.style.display = "block";
    return;
  }
  if (RANKS_ORDER.some(r => norm(r) === norm(name))) {
    errEl.textContent = `Ya existe un rango llamado "${name}".`;
    errEl.style.display = "block";
    return;
  }
  RANKS_ORDER.push(name);
  RANKS[name] = [];
  input.value = "";
  renderRanksEditor();
  toast(`Rango "${name}" añadido. Recuerda guardar los cambios.`);
};

window.saveRanksChanges = async function() {
  const okEl = document.getElementById("ranksOk");
  try {
    await saveRanksConfig();
    renderRankSelector();
    okEl.style.display = "block";
    setTimeout(() => okEl.style.display = "none", 2500);
    toast("✓ Rangos guardados en la base de datos", "success");
  } catch (err) {
    toast(`Error al guardar: ${err?.code || err?.message || "desconocido"}`, "error");
  }
};

async function loadSpellsViaEdge() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return null;
    const res = await fetch(`${SUPABASE_SERVICE_FUNCTION_URL}/save-student-spells`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ action: "load" })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.spells : null;
  } catch { return null; }
}

async function loadAllStudents() {
  allStudents = {}; allGraduated = {}; allRanks = {}; allCredentials = {}; usernameIndex = {}; allInfractions = {}; studentIdMap = {};

  try {
    // Cargar estudiantes e infracciones directamente (RLS permite lectura)
    // Los hechizos se cargan en paralelo: intento directo + edge function como fallback
    const [{ data: students, error: studentsErr }, directSpells, edgeSpells, { data: allInfr, error: infErr }] = await Promise.all([
      supabase.from("students").select("id, name, graduated, current_rank, username"),
      supabase.from("student_spells").select("student_id, source_spell_name, learned"),
      loadSpellsViaEdge(),
      supabase.from("infractions").select("*")
    ]);

    if (studentsErr) {
      console.error("Error cargando estudiantes:", studentsErr);
      toast("Error al cargar estudiantes", "error");
      return;
    }

    if (!students || students.length === 0) return;

    // Preferir edge function (usa service_role, devuelve datos completos)
    // Solo usar query directa como fallback si edge function falló
    const allSpells = (edgeSpells && edgeSpells.length > 0)
      ? edgeSpells
      : (directSpells.data || []);

    // Mapear hechizos por student_id
    const spellsByStudent = {};
    allSpells.forEach(s => {
      if (!spellsByStudent[s.student_id]) spellsByStudent[s.student_id] = {};
      spellsByStudent[s.student_id][s.source_spell_name] = s.learned;
    });

    // Mapear infracciones por student_id
    const infrByStudent = {};
    if (allInfr) {
      allInfr.forEach(inf => {
        if (!infrByStudent[inf.student_id]) infrByStudent[inf.student_id] = [];
        infrByStudent[inf.student_id].push(inf);
      });
    }

    // Procesar estudiantes
    students.forEach(student => {
      const spellsObj = spellsByStudent[student.id] || {};
      allStudents[student.name] = spellsObj;
      studentIdMap[student.name] = student.id;
      allGraduated[student.name] = student.graduated || false;
      allRanks[student.name] = student.current_rank || calcRankLegacy(spellsObj);
      allInfractions[student.name] = infrByStudent[student.id] || [];

      if (student.username) {
        allCredentials[student.name] = {
          username: student.username,
          passwordHash: "auth",
          authUserId: null,
          credentialsUpdatedAt: null
        };
        usernameIndex[student.username.toLowerCase()] = student.name;
      }
    });
  } catch (err) {
    console.error("Error en loadAllStudents:", err);
    toast("Error al cargar estudiantes", "error");
  }
}

async function saveStudent(name, spells) {
  // Tanto admin como alumno guardan via edge function (service role, auto-crea spells)
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error("Sesión no activa. Vuelve a iniciar sesión.");

  const res = await fetch(`${SUPABASE_SERVICE_FUNCTION_URL}/save-student-spells`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({ studentName: name, spells })
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || `Error HTTP ${res.status}`);
  }
  allStudents[name] = spells;
}

async function createStudent(name, spells) {
  const initialRank = selectedRank || RANKS_ORDER[0];

  const { data: existing, error: existingError } = await supabase
    .from("students")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) throw new Error("Ya existe un alumno con ese nombre");

  const username = generateUniqueUsername(name);

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      name,
      username,
      current_rank: initialRank,
      graduated: false,
      source_firestore_id: `manual_${crypto.randomUUID()}`
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!student?.id) throw new Error("No se pudo crear el alumno");

  await saveStudent(name, spells);

  allStudents[name] = spells;
  allGraduated[name] = false;
  allRanks[name] = initialRank;
  allInfractions[name] = [];
  allCredentials[name] = { username, passwordHash: "auth", authUserId: null, credentialsUpdatedAt: null };
  usernameIndex[username.toLowerCase()] = name;

  return student;
}

async function updateStudentRank(name, rank) {
  try {
    const { error } = await supabase
      .from("students")
      .update({ current_rank: rank })
      .eq("name", name);

    if (error) throw error;
  } catch (err) {
    console.error("Error actualizando rango:", err);
  }
}

async function setGraduated(name, val) {
  try {
    const { error } = await supabase
      .from("students")
      .update({ graduated: val })
      .eq("name", name);

    if (error) throw error;
    allGraduated[name] = val;
  } catch (err) {
    console.error("Error actualizando graduado:", err);
    toast("Error al guardar cambios", "error");
  }
}

// Borrado manual: limpia las tablas dependientes antes de borrar al alumno.
// Se usa cuando la función SQL delete_student_full aún no está instalada.
async function deleteStudentManual(name) {
  let sid = studentIdMap[name];
  if (!sid) {
    const { data } = await supabase.from("students").select("id").eq("name", name).single();
    if (!data?.id) throw new Error(`Alumno no encontrado: ${name}`);
    sid = data.id;
  }

  // Lo primero: desvincular las bitácoras sin tocar attendant_name, que es
  // donde vive el nombre. Así el historial sigue mostrándolo aunque el alumno
  // ya no exista, y un posible CASCADE no tiene filas que arrastrar.
  await supabase.from("bitacora_attendants").update({ student_id: null }).eq("student_id", sid);

  // Sin esto, el DELETE de students falla con error 23503 (clave foránea)
  await supabase.from("attendance_records").delete().eq("student_id", sid);
  await supabase.from("student_spells").delete().eq("student_id", sid);
  await supabase.from("infractions").delete().eq("student_id", sid);

  const { error } = await supabase.from("students").delete().eq("id", sid);
  if (error) throw error;
}

async function deleteStudent(name) {
  // Vía principal: RPC con SECURITY DEFINER (borra dependencias, credenciales y usuario auth)
  const { data: result, error } = await supabase.rpc("delete_student_full", { p_name: name });

  if (error) {
    if (error.code === "PGRST202") {
      // La función SQL no está instalada en la base de datos todavía
      console.warn("[deleteStudent] delete_student_full no existe; borrando manualmente. " +
                   "Ejecuta supabase/migrations/004_delete_student_rpc.sql para el borrado completo.");
      await deleteStudentManual(name);
    } else {
      throw error;
    }
  } else if (!result?.success) {
    throw new Error(result?.error || "No se pudo borrar");
  }

  delete allStudents[name];
  delete allGraduated[name];
  delete allRanks[name];
  delete allInfractions[name];
  delete studentIdMap[name];
  if (allCredentials[name]) {
    delete usernameIndex[(allCredentials[name].username || "").toLowerCase()];
    delete allCredentials[name];
  }
}

// =====================================================================
//  UI STATE
// =====================================================================
let currentStudent = null;
let pendingChanges = {};

let currentScreen = "scSearch";
// Pantallas con layout de rejilla en escritorio (styles.css >=1100px);
// un display:block inline anularía ese grid.
const SCREEN_DISPLAY = { scBitacoras: "grid", scPersonas: "grid" };
window.show = function(id) {
  const prev = currentScreen;
  ["scSearch","scProfile","scAdminLogin","scAdmin","scBitacoras","scBlocked","scDirectory","scPersonas"].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = "none";
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = SCREEN_DISPLAY[id] || "block";
    if (id !== prev) {
      target.classList.remove("screen-anim");
      void target.offsetWidth;              // reinicia la animación
      target.classList.add("screen-anim");
    }
  }
  currentScreen = id;
  // Resalta el botón de navegación correspondiente a la pantalla activa
  document.querySelectorAll(".app-nav-btn[data-screen]").forEach(b =>
    b.classList.toggle("active", b.dataset.screen === id));
  if (id !== prev) window.scrollTo({ top: 0 });
};
const show = window.show;

// =====================================================================
//  NAVIGATION HEADER
// =====================================================================
function updateAppHeader() {
  const header     = document.getElementById("appHeader");
  const userHeader = document.getElementById("appHeaderUser");
  const adminBar   = document.getElementById("adminQuickBar");
  if (!header) return;

  if (!isAdmin && !loggedInStudent) {
    header.style.display   = "none";
    if (adminBar) adminBar.style.display = "none";
    return;
  }

  header.style.display = "block";

  if (loggedInStudent) {
    const rank = getStudentRank(loggedInStudent);
    userHeader.innerHTML = `
      <div class="app-header-left">
        <span class="app-header-name">${escHtml(loggedInStudent)}</span>
        <span class="app-header-rank rank-badge ${rankClass("rk", rank)}">${escHtml(rank)}</span>
      </div>
      <nav class="app-header-nav">
        <button class="app-nav-btn" data-screen="scProfile" onclick="openProfile(loggedInStudent)">👤 Perfil</button>
        <button class="app-nav-btn" data-screen="scBitacoras" onclick="showBitacoras('profile')">📋 Bitácoras</button>
        <button class="app-nav-btn" data-screen="scPersonas" onclick="showPersonas('profile')">👥 Personas</button>
        <button class="app-nav-btn" data-screen="scDirectory" onclick="showDirectory('profile')">🗺 Directorio</button>
      </nav>
      <button class="app-nav-btn app-nav-logout" onclick="goSearch()">Salir ✕</button>`;
  } else if (isAdmin) {
    userHeader.innerHTML = `
      <div class="app-header-left">
        <span class="app-header-name">${isSuperAdmin ? "⚙ Superadmin" : "⚙ Admin"}</span>
      </div>
      <nav class="app-header-nav">
        <button class="app-nav-btn" data-screen="scAdmin" onclick="show('scAdmin')">⚙ Panel</button>
        <button class="app-nav-btn" data-screen="scBitacoras" onclick="showBitacoras('admin')">📋 Bitácoras</button>
        <button class="app-nav-btn" data-screen="scPersonas" onclick="showPersonas('admin')">👥 Personas</button>
        <button class="app-nav-btn" data-screen="scDirectory" onclick="showDirectory('admin')">🗺 Directorio</button>
      </nav>
      <button class="app-nav-btn app-nav-logout" onclick="cerrarSesion()">Salir ✕</button>`;
  }

  if (adminBar) adminBar.style.display = isAdmin ? "flex" : "none";

  // Mantiene resaltado el botón de la pantalla activa tras redibujar la nav
  document.querySelectorAll(".app-nav-btn[data-screen]").forEach(b =>
    b.classList.toggle("active", b.dataset.screen === currentScreen));
}

function goSearch() {
  loggedInStudent = null;
  clearSession();              // volver al inicio = cerrar sesión
  selectedAttendants.clear();  // la selección del formulario no debe pasar a otra sesión
  show("scSearch");
  const uEl = document.getElementById("loginUser");
  const pEl = document.getElementById("loginPwd");
  const eEl = document.getElementById("loginErr");
  if (uEl) uEl.value = "";
  if (pEl) pEl.value = "";
  if (eEl) eEl.style.display = "none";
  pendingChanges = {}; isAdmin = false;
  updateAppHeader();
}
window.goSearch = goSearch;

function showAdminLogin() {
  show("scAdminLogin");
  document.getElementById("adminPwd").value  = "";
  document.getElementById("adminErr").style.display = "none";
}
window.showAdminLogin = showAdminLogin;

window.backFromProfile = async function() {
  if (isProfileDirty()) {
    const ok = await showModal(
      "Cambios sin guardar",
      "Tienes hechizos modificados que aún no has guardado. ¿Salir de todos modos y descartar los cambios?",
      "Salir sin guardar", "danger"
    );
    if (!ok) return;
  }
  if (isAdmin) {
    show("scAdmin");
    renderList();
    renderAscensos();
    loadInventory().catch(() => {});
  }
  else { loggedInStudent = null; goSearch(); }
};

window.cerrarSesion = function() {
  isAdmin = false; isSuperAdmin = false;
  clearTimeout(_sessionTimer); _sessionTimer = null;
  clearSession();
  const secBtn = document.getElementById("tabSecurityBtn");
  if (secBtn) secBtn.style.display = "none";
  updateAppHeader();
  goSearch();
  toast("Sesión cerrada");
};

// =====================================================================
//  STUDENT LOGIN
// =====================================================================
window.studentLogin = async function() {
  const uEl = document.getElementById("loginUser");
  const pEl = document.getElementById("loginPwd");
  const eEl = document.getElementById("loginErr");
  const user = (uEl.value || "").trim().toLowerCase();
  const pwd  = pEl.value;

  eEl.style.display = "none";
  eEl.textContent = "Usuario o contraseña incorrectos.";

  // Rate limit: 5 intentos fallidos → bloqueo 15 min
  // TEMPORALMENTE DESHABILITADO PARA DEBUG
  // const lockLeft = loginLockRemaining("mm_sl");
  // if (lockLeft > 0) {
  //   eEl.textContent = `Demasiados intentos. Espera ${lockLeft} minuto${lockLeft !== 1 ? "s" : ""}.`;
  //   eEl.style.display = "block"; return;
  // }

  if (!user || !pwd) { eEl.style.display = "block"; return; }

  try {
    // Intentar login con Supabase Auth normal (usuarios ya migrados)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: authEmailForUsername(user),
      password: pwd
    });

    if (data?.user) {
      // Login exitoso en Supabase Auth
      await loadAllStudents();
      const studentName = usernameIndex[user.toLowerCase()] || user;
      window.loggedInStudent = studentName;
      clearLoginLock("mm_sl");
      pEl.value = "";
      const remember = document.getElementById("loginRemember");
      if (remember && remember.checked) saveSession({ kind: "student", name: studentName, userId: data.user.id });
      else clearSession();
      updateAppHeader();
      openProfile(studentName);
      return;
    }

    // Si falló, intentar legacy-login (usuarios no migrados aún)
    console.log(`[studentLogin] Intentando login legacy para: ${user}`);
    try {
      // 1. Buscar credenciales legacy via RPC
      const { data: legacyCreds, error: credError } = await supabase
        .rpc("get_student_hash", { p_username: user });

      if (credError || !legacyCreds) {
        console.log(`[studentLogin] Credenciales no encontradas para ${user}`);
        throw new Error("Credenciales inválidas");
      }

      // 2. Calcular hash SHA-256 de la contraseña (mismo que frontend)
      const salt = atob("bWVkaW1hZ2lh") + atob("X3N0dWRlbnRf") + atob("djFf");
      const hashInput = salt + pwd;
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
      const receivedHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // 3. Comparar hashes (timing-safe)
      if (receivedHash !== legacyCreds.hash) {
        console.log(`[studentLogin] Hash incorrecto para ${user}`);
        throw new Error("Credenciales inválidas");
      }

      console.log(`[studentLogin] ✅ Credenciales válidas para ${user}`);

      // 4. Si ya está migrado, login directo
      if (legacyCreds.auth_user_id) {
        console.log(`[studentLogin] Usuario ya migrado, login directo`);
        await loadAllStudents();
        const studentName = usernameIndex[user.toLowerCase()] || user;
        window.loggedInStudent = studentName;
        clearLoginLock("mm_sl");
        pEl.value = "";
        const remember = document.getElementById("loginRemember");
        if (remember && remember.checked) saveSession({ kind: "student", name: studentName, userId: legacyCreds.auth_user_id });
        else clearSession();
        updateAppHeader();
        openProfile(studentName);
        return;
      }

      // 5. Credenciales validadas - cambiar contraseña en auth.users
      console.log(`[studentLogin] ✅ Hash válido, sincronizando con Supabase Auth...`);

      // Llamar RPC function para cambiar la contraseña en auth.users
      const { data: resetData, error: resetError } = await supabase
        .rpc("reset_auth_password", { p_username: user, p_new_password: pwd });

      if (resetError || !resetData?.success) {
        console.log(`[studentLogin] Error al sincronizar:`, resetError?.message || resetData?.error);
        throw new Error("Error al sincronizar contraseña");
      }

      const authUserId = resetData.auth_user_id;
      console.log(`[studentLogin] Contraseña sincronizada, haciendo login...`);

      // Ahora hacer login con la contraseña que acabamos de establecer
      const emailSynthetic = authEmailForUsername(user);
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailSynthetic,
        password: pwd
      });

      if (loginError) {
        console.log(`[studentLogin] Login falló:`, loginError.message);
        throw new Error("Error en login");
      }

      console.log(`[studentLogin] ✅ Login exitoso para ${user}`);
      await loadAllStudents();
      const studentName = usernameIndex[user.toLowerCase()] || user;
      window.loggedInStudent = studentName;
      clearLoginLock("mm_sl");
      pEl.value = "";
      const remember = document.getElementById("loginRemember");
      if (remember && remember.checked) saveSession({ kind: "student", name: studentName, userId: authUserId });
      else clearSession();
      updateAppHeader();
      openProfile(studentName);
      return;
    } catch (legacyErr) {
      console.error("[studentLogin] Legacy login error:", legacyErr.message || String(legacyErr));
    }

    // Ambos fallaron: credenciales incorrectas
    // recordFailedLogin("mm_sl"); // Rate limiting deshabilitado
    // const left = loginLockRemaining("mm_sl");
    // if (left > 0) eEl.textContent = `Usuario o contraseña incorrectos. Cuenta bloqueada ${left} min.`;
    eEl.textContent = "Usuario o contraseña incorrectos.";
    eEl.style.display = "block";
  } catch (err) {
    console.error("Login error:", err);
    // recordFailedLogin("mm_sl"); // Rate limiting deshabilitado
    eEl.textContent = "Error al iniciar sesión. Intenta de nuevo.";
    eEl.style.display = "block";
  }
};

// =====================================================================
//  PROFILE
// =====================================================================
function renderBitCount(name) {
  const el = document.getElementById("pBitCount");
  if (!el) return;
  if (!bitacorasLoaded) {
    el.innerHTML = `<div class="profile-bit-stats"><div class="profile-bit-stat profile-bit-loading">📋 <span>cargando…</span></div></div>`;
    return;
  }
  const now = new Date();
  const ty = now.getFullYear(), tm = now.getMonth();
  const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
  const ct    = bitCntMonth(name, ty, tm);
  const cl    = bitCntMonth(name, ly, lm);
  const total = allBitacoras.filter(b => b.attendants && b.attendants.includes(name)).length;
  const mThis = capitalize(new Date(ty, tm, 1).toLocaleDateString("es-ES", { month: "long" }));
  const mLast = capitalize(new Date(ly, lm, 1).toLocaleDateString("es-ES", { month: "long" }));
  const pill  = (label, n, warn) =>
    `<div class="profile-bit-stat${warn ? " bit-warn" : ""}">` +
    `<span class="bit-label">${label}</span><strong>${n}</strong>` +
    (warn ? `<span class="bit-alert">⚠</span>` : "") +
    `</div>`;
  el.innerHTML = `<div class="profile-bit-stats">
    ${pill(mThis, ct, ct < 3)}
    ${pill(mLast, cl, cl < 3)}
    ${pill("Total", total, false)}
  </div>`;
}

window.openProfile = function(name) {
  currentStudent = name;
  if (!allStudents[name]) {
    console.warn(`Datos no encontrados para ${name}. Recargando...`);
    loadAllStudents().then(() => {
      if (!allStudents[name]) {
        alert("No se pudieron cargar los datos del estudiante");
        return;
      }
      pendingChanges = JSON.parse(JSON.stringify(allStudents[name]));
      renderProfile();
      show("scProfile");
    });
    return;
  }
  pendingChanges = JSON.parse(JSON.stringify(allStudents[name]));
  renderProfile();
  show("scProfile");
  document.getElementById("profileBackBtn").textContent =
    isAdmin ? "← Volver al panel" : "← Cerrar sesión";
  if (!bitacorasLoaded) {
    renderBitCount(name);
    loadBitacoras()
      .then(() => { bitacorasLoaded = true; renderBitCount(name); updatePatientDatalist(); })
      .catch(() => {
        const el = document.getElementById("pBitCount");
        if (el) el.innerHTML = "";
      });
  }
  renderProfileAttendance(name);
}

// Firma de hechizos independiente del orden de claves → detecta cambios reales
function spellSig(sp) { return allSpells().map(s => (sp && sp[s]) ? "1" : "0").join(""); }
function isProfileDirty() {
  return !!currentStudent && !!allStudents[currentStudent] &&
    spellSig(pendingChanges) !== spellSig(allStudents[currentStudent]);
}
function updateDirtyState() {
  const el = document.getElementById("unsavedBadge");
  if (el) el.style.display = isProfileDirty() ? "inline-flex" : "none";
}

function renderProfile() {
  const sp   = pendingChanges;
  const name = currentStudent;
  const grad = allGraduated[name] || false;
  const rank = getStudentRank(name);
  const ascending = canAscend(sp, rank);
  const nextRank  = RANKS_ORDER[RANKS_ORDER.indexOf(rank) + 1];
  const all = allSpells();
  const totalPct = Math.round(all.filter(s => sp[s]).length / all.length * 100);

  document.getElementById("pName").textContent = name;
  const rkEl = document.getElementById("pRank");
  if (grad) { rkEl.textContent = "Graduado"; rkEl.className = "rank-badge rk-Graduado"; }
  else       { rkEl.textContent = rank;        rkEl.className = "rank-badge " + rankClass("rk", rank); }

  document.getElementById("adminBadge").style.display = isAdmin ? "inline" : "none";
  renderRankEditor(name, grad ? "Graduado" : rank);
  renderNameEditor(name);
  renderInfractions(name);

  const profileCard = document.querySelector("#scProfile .card");
  profileCard.classList.toggle("grad-card", grad);

  const gradBtn = document.getElementById("gradBtn");
  if (isAdmin) {
    gradBtn.style.display = "inline-flex";
    gradBtn.textContent   = grad ? "✕ Revocar graduación" : "🎓 Graduar alumno";
    gradBtn.className     = grad ? "btn danger" : "btn";
  } else {
    gradBtn.style.display = "none";
  }

  // Banner
  const banner = document.getElementById("ascBanner");
  if (grad) {
    banner.innerHTML = `<div class="grad-banner">
      <div class="grad-icon">🎓</div>
      <div class="big">Graduado/a del Colegio</div>
      <div class="grad-divider"></div>
      <div class="sub">Ha completado su formación con distinción.</div>
    </div>`;
  } else if (ascending && nextRank) {
    banner.innerHTML = `<div class="ascenso-banner">
      <div class="big">✦ Listo para ascender a ${escHtml(nextRank)}</div>
      <div class="sub">Notifica a un administrador para que confirme el ascenso.</div>
    </div>`;
  } else if (rank === RANKS_ORDER[RANKS_ORDER.length - 1] && RANKS[rank].filter(s => !sp[s]).length === 0) {
    banner.innerHTML = `<div class="ascenso-banner">
      <div class="big">✦ Dominio completo alcanzado</div>
      <div class="sub">Has aprendido todos los hechizos del rango ${escHtml(rank)}.</div>
    </div>`;
  } else {
    const missing = RANKS[rank].filter(s => !sp[s]).length;
    const need    = Math.max(0, missing - ASCENSO_MISSING);
    banner.innerHTML = `<div class="no-ascenso-banner">
      <div class="big">Aún no puedes ascender</div>
      <div class="sub">Te faltan ${need} hechizo${need !== 1 ? "s" : ""} más en ${escHtml(rank)} (se permiten hasta ${ASCENSO_MISSING} sin aprender).</div>
    </div>`;
  }

  document.getElementById("pOvPct").textContent = totalPct + "%";
  setTimeout(() => { document.getElementById("pOvBar").style.width = totalPct + "%"; }, 50);
  renderBitCount(name);

  let tip = "";
  for (const rk of RANKS_ORDER) {
    const { pct } = getRkPct(sp, rk);
    if (pct < 100) {
      const miss = RANKS[rk].filter(s => !sp[s]);
      tip = `Te faltan en <strong>${escHtml(rk)}</strong>: ${miss.map(escHtml).join(", ")}.`;
      break;
    }
  }
  document.getElementById("pTip").innerHTML = tip || "Todos los hechizos aprendidos.";

  document.getElementById("pGrid").innerHTML = RANKS_ORDER.map(rk => {
    const { done, total, pct } = getRkPct(sp, rk);
    const rkMissing = RANKS[rk].filter(s => !sp[s]).length;
    const cls = rkMissing <= ASCENSO_MISSING ? "ok" : done === 0 ? "no" : "mid";
    const allOn = RANKS[rk].length > 0 && RANKS[rk].every(s => sp[s]);
    const toggleAll = isAdmin
      ? `<button class="rk-toggle-all" onclick="toggleRankSpells('${safeAttr(rk)}')">${allOn ? "Quitar todos" : "Marcar todos"}</button>`
      : "";
    const rows = RANKS[rk].map(s => {
      const on  = sp[s];
      const key = domKey(s);
      return `<div class="spell-row" onclick="toggleSpell('${safeAttr(s)}')">
        <div class="spell-dot ${on ? "on" : "off"}" id="dot_${key}"></div>
        <span class="spell-txt ${on ? "" : "off"}" id="txt_${key}">${escHtml(s)}</span>
      </div>`;
    }).join("");
    return `<div class="rk-card">
      <div class="rk-card-head">
        <span class="rk-card-name">${escHtml(rk)}</span>
        <span class="rk-card-head-right">
          ${toggleAll}
          <span class="rk-pct c-${cls}" id="rkpct_${domKey(rk)}">${done}/${total}</span>
        </span>
      </div>
      <div class="mini-bar"><div class="mini-fill f-${cls}" id="rkbar_${domKey(rk)}" style="width:${pct}%"></div></div>
      <div class="spells-list">${rows}</div>
    </div>`;
  }).join("");

  updateDirtyState();
}

// Admin: marcar/quitar todos los hechizos de un rango de golpe
window.toggleRankSpells = function(rk) {
  if (!isAdmin) return;
  const spells = RANKS[rk] || [];
  const allOn = spells.length > 0 && spells.every(s => pendingChanges[s]);
  spells.forEach(s => pendingChanges[s] = !allOn);
  renderProfile();
};

// =====================================================================
//  ADMIN — CAMBIO MANUAL DE RANGO
// =====================================================================
function renderRankEditor(name, displayRank) {
  const wrap = document.getElementById("pRankEdit");
  if (!wrap) return;
  if (!isAdmin || allGraduated[name]) { wrap.innerHTML = ""; return; }
  const current = allRanks[name] || RANKS_ORDER[0];
  const opts = RANKS_ORDER.map(rk =>
    `<option value="${escHtml(rk)}" ${rk === current ? "selected" : ""}>${escHtml(rk)}</option>`
  ).join("");
  wrap.innerHTML = `
    <div class="rank-manual-edit">
      <label for="manualRankSelect">Cambiar rango manualmente</label>
      <div class="rank-manual-row">
        <select id="manualRankSelect">${opts}</select>
        <button class="btn sm" onclick="applyManualRank()">Aplicar</button>
      </div>
    </div>`;
}

function renderNameEditor(name) {
  const wrap = document.getElementById("pNameEdit");
  if (!wrap) return;
  if (!isAdmin) { wrap.innerHTML = ""; return; }
  const user = allCredentials[name]?.username || "";
  wrap.innerHTML = `
    <div class="name-manual-edit">
      <label for="editStudentName">Renombrar medimago</label>
      <div class="name-manual-row">
        <input type="text" id="editStudentName" maxlength="80" placeholder="Nombre"
               value="${escHtml(name)}" oninput="suggestUsernameFromName()"/>
        <input type="text" id="editStudentUser" maxlength="60" placeholder="usuario"
               value="${escHtml(user)}" autocapitalize="none" spellcheck="false"
               oninput="this.dataset.touched='1'"/>
        <button class="btn sm" onclick="applyRename()">Guardar</button>
      </div>
      <p class="name-edit-hint">
        Se actualizan también sus bitácoras y su acceso. El usuario solo admite
        letras, números y puntos: los apóstrofos y acentos se quitan solos.
      </p>
    </div>`;
}

// Al escribir el nombre, propone el usuario correspondiente, pero solo
// mientras el admin no lo haya escrito él a mano.
window.suggestUsernameFromName = function() {
  const nEl = document.getElementById("editStudentName");
  const uEl = document.getElementById("editStudentUser");
  if (!nEl || !uEl || uEl.dataset.touched === "1") return;
  uEl.value = makeUsername(nEl.value);
};

window.applyRename = async function() {
  const oldName = currentStudent;
  const nEl = document.getElementById("editStudentName");
  const uEl = document.getElementById("editStudentUser");
  if (!nEl || !uEl || !oldName) return;

  const newName = nEl.value.trim();
  const newUser = (uEl.value.trim() || makeUsername(newName))
                    .toLowerCase().replace(/[^a-z0-9.]/g, "");
  const oldUser = allCredentials[oldName]?.username || "";

  if (!newName)  { toast("El nombre no puede estar vacío", "error"); return; }
  if (!newUser)  { toast("El usuario no puede estar vacío", "error"); return; }
  if (newName === oldName && newUser === oldUser) return;

  // Aviso previo: el email de acceso ignora los puntos, así que dos
  // usuarios distintos pueden acabar en la misma cuenta.
  const choque = Object.entries(usernameIndex)
    .find(([u, n]) => n !== oldName && loginKey(u) === loginKey(newUser));
  if (choque) {
    toast(`Ese usuario compartiría acceso con ${choque[1]}. Añade algo que lo distinga.`, "error");
    return;
  }

  const ok = await showModal(
    "Renombrar medimago",
    `${oldName} pasará a llamarse ${newName}, con usuario "${newUser}". ` +
    `Sus bitácoras y su acceso se actualizarán. Si tenía contraseña, seguirá siendo la misma.`,
    "Renombrar", "success"
  );
  if (!ok) return;

  try {
    const { data, error } = await supabase.rpc("rename_student", {
      p_old_name: oldName, p_new_name: newName, p_new_username: newUser
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "No se pudo renombrar");

    // Los nombres viajan por muchas tablas: recargar todo evita inconsistencias
    bitacorasLoaded = false;
    await loadAllStudents();
    await loadBitacoras().then(() => { bitacorasLoaded = true; }).catch(() => {});

    currentStudent = data.name;
    openProfile(data.name);
    toast(`Renombrado a ${data.name}`, "success");
  } catch (err) {
    console.error("Error renombrando:", err);
    const detalle = [err?.message, err?.hint].filter(Boolean).join(" · ") || "error desconocido";
    toast(`No se pudo renombrar: ${detalle}`, "error");
  }
};

window.applyManualRank = async function() {
  const sel  = document.getElementById("manualRankSelect");
  const name = currentStudent;
  if (!sel || !name) return;
  const newRank = sel.value;
  const oldRank = allRanks[name] || RANKS_ORDER[0];
  if (!RANKS_ORDER.includes(newRank) || newRank === oldRank) return;

  const dir = RANKS_ORDER.indexOf(newRank) > RANKS_ORDER.indexOf(oldRank) ? "subir" : "bajar";
  const ok = await showModal(
    "Cambiar rango manualmente",
    `¿${dir === "subir" ? "Subir" : "Bajar"} a ${name} de "${oldRank}" a "${newRank}"? Esto sobrescribe el cálculo automático según hechizos aprendidos.`,
    dir === "subir" ? "Subir" : "Bajar", dir === "subir" ? "success" : "danger"
  );
  if (!ok) { sel.value = oldRank; return; }

  try {
    const { error } = await supabase
      .from("students")
      .update({ current_rank: newRank })
      .eq("name", name);
    if (error) throw error;
  } catch (err) {
    console.error("Error al cambiar rango:", err);
    toast(`Error al guardar: ${err?.code || err?.message || "desconocido"}`, "error");
    sel.value = oldRank;
    return;
  }
  allRanks[name] = newRank;
  renderProfile();
  toast(`Rango de ${name} cambiado a ${newRank}`, "success");
};

// =====================================================================
//  ADMIN — INFRACCIONES
// =====================================================================
function renderInfractions(name) {
  const wrap = document.getElementById("pInfractions");
  if (!wrap) return;
  const list = allInfractions[name] || [];
  const rows = list.length
    ? list.map((inf, i) => `<div class="infraction-row">
        <div class="infraction-main">
          <span class="infraction-date">${formatDate(inf.date)}</span>
          <span class="infraction-reason">${escHtml(inf.reason)}</span>
        </div>
        ${isAdmin ? `<button class="btn sm danger" onclick="removeInfraction(${i})" title="Eliminar">×</button>` : ""}
      </div>`).join("")
    : '<p class="empty-state">Sin infracciones registradas.</p>';

  wrap.innerHTML = `
    <div class="divider"></div>
    <p class="card-title" style="font-size:.92rem">⚠ Infracciones${list.length ? ` <span class="sec-count">${list.length}</span>` : ""}</p>
    <div class="infractions-list">${rows}</div>
    ${isAdmin ? `
      <div class="rank-add-spell" style="margin-top:.6rem">
        <input type="text" id="infractionReason" placeholder="Motivo de la infracción" maxlength="300"
               onkeydown="if(event.key==='Enter')addInfraction()"/>
        <button type="button" class="btn sm danger" onclick="addInfraction()">+ Añadir infracción</button>
      </div>
      <p class="err" id="infractionErr"></p>` : ""}
  `;
}

window.addInfraction = async function() {
  const input = document.getElementById("infractionReason");
  const errEl = document.getElementById("infractionErr");
  const name  = currentStudent;
  if (!input || !name) return;
  errEl.style.display = "none";
  const reason = input.value.trim();
  if (!reason) {
    errEl.textContent = "Escribe el motivo de la infracción.";
    errEl.style.display = "block";
    return;
  }
  if (reason.length > 300) {
    errEl.textContent = "El motivo no puede superar los 300 caracteres.";
    errEl.style.display = "block";
    return;
  }
  try {
    const student = allStudents[name];
    if (!student) throw new Error("Estudiante no encontrado");
    const { error } = await supabase
      .from("infractions")
      .insert({
        student_id: student.id,
        reason: reason,
        infraction_date: new Date().toISOString()
      });
    if (error) throw error;
  } catch (err) {
    errEl.textContent = `Error al guardar: ${err?.code || err?.message || "desconocido"}`;
    errEl.style.display = "block";
    return;
  }
  const list = [...(allInfractions[name] || []), { reason, date: new Date().toISOString() }];
  allInfractions[name] = list;
  input.value = "";
  renderInfractions(name);
  toast("Infracción registrada", "success");
};

window.removeInfraction = async function(idx) {
  const name = currentStudent;
  if (!name) return;
  const ok = await showModal(
    "Eliminar infracción",
    "¿Eliminar esta infracción del historial del alumno? Esta acción no se puede deshacer.",
    "Eliminar", "danger"
  );
  if (!ok) return;
  const infraList = allInfractions[name] || [];
  const infraToDelete = infraList[idx];
  if (!infraToDelete || !infraToDelete.id) {
    toast("Error: infracción no identificada", "error");
    return;
  }
  try {
    const { error } = await supabase
      .from("infractions")
      .delete()
      .eq("id", infraToDelete.id);
    if (error) throw error;
  } catch (err) {
    toast(`Error al eliminar: ${err?.code || err?.message || "desconocido"}`, "error");
    return;
  }
  const list = infraList.filter((_, i) => i !== idx);
  allInfractions[name] = list;
  renderInfractions(name);
  toast("Infracción eliminada");
};

window.toggleSpell = function(s) {
  pendingChanges[s] = !pendingChanges[s];
  const key = domKey(s);
  const dot = document.getElementById("dot_" + key);
  const txt = document.getElementById("txt_" + key);
  if (dot) dot.className = "spell-dot " + (pendingChanges[s] ? "on" : "off");
  if (txt) txt.className = "spell-txt "  + (pendingChanges[s] ? ""   : "off");

  const rk = RANKS_ORDER.find(r => RANKS[r].includes(s));
  if (rk) {
    const { done, total, pct } = getRkPct(pendingChanges, rk);
    const rkMiss = total - done;
    const cls = rkMiss <= ASCENSO_MISSING ? "ok" : done === 0 ? "no" : "mid";
    const pEl = document.getElementById("rkpct_" + domKey(rk));
    const bEl = document.getElementById("rkbar_"  + domKey(rk));
    if (pEl) { pEl.textContent = `${done}/${total}`; pEl.className = "rk-pct c-" + cls; }
    if (bEl) { bEl.style.width = pct + "%";           bEl.className = "mini-fill f-" + cls; }
  }

  const all = allSpells();
  const tp  = Math.round(all.filter(sp => pendingChanges[sp]).length / all.length * 100);
  document.getElementById("pOvPct").textContent = tp + "%";
  document.getElementById("pOvBar").style.width  = tp + "%";

  const rank = getStudentRank(currentStudent);
  const ascending = canAscend(pendingChanges, rank);
  const nextRank  = RANKS_ORDER[RANKS_ORDER.indexOf(rank) + 1];
  const banner    = document.getElementById("ascBanner");
  if (ascending && nextRank) {
    banner.innerHTML = `<div class="ascenso-banner"><div class="big">✦ Listo para ascender a ${escHtml(nextRank)}</div><div class="sub">Notifica a un administrador para que confirme el ascenso.</div></div>`;
  } else if (rank === RANKS_ORDER[RANKS_ORDER.length - 1] && RANKS[rank].filter(s => !pendingChanges[s]).length === 0) {
    banner.innerHTML = `<div class="ascenso-banner"><div class="big">✦ Dominio completo alcanzado</div></div>`;
  } else {
    const missing = RANKS[rank].filter(s => !pendingChanges[s]).length;
    const need    = Math.max(0, missing - ASCENSO_MISSING);
    banner.innerHTML = `<div class="no-ascenso-banner"><div class="big">Aún no puedes ascender</div><div class="sub">Te faltan ${need} hechizo${need !== 1 ? "s" : ""} más en ${escHtml(rank)}.</div></div>`;
  }

  updateDirtyState();
};

window.guardarCambios = async function() {
  const btn = document.getElementById("saveBtn");
  btn.disabled = true; btn.textContent = "Guardando…";
  try {
    // Enviar TODOS los hechizos (on y off), no solo los que se han tocado
    const completeSpells = {};
    for (const rk of RANKS_ORDER) {
      for (const s of (RANKS[rk] || [])) {
        completeSpells[s] = !!pendingChanges[s];
      }
    }
    await saveStudent(currentStudent, completeSpells);
    allStudents[currentStudent] = completeSpells;
    const newRank = calcRankLegacy(completeSpells);
    await updateStudentRank(currentStudent, newRank);
    allRanks[currentStudent] = newRank;
    document.getElementById("savedMsg").style.display = "inline";
    setTimeout(() => document.getElementById("savedMsg").style.display = "none", 2500);
    updateDirtyState();
    renderProfile();
    toast("Cambios guardados", "success");
  } catch (err) {
    console.error("Error guardando cambios:", err);
    toast(`Error al guardar: ${err?.message || "Comprueba tu conexión."}`, "error");
  }
  btn.disabled = false; btn.textContent = "Guardar cambios";
};

// =====================================================================
//  GRADUATION
// =====================================================================
window.toggleGraduation = async function() {
  const name   = currentStudent;
  const newVal = !(allGraduated[name] || false);
  const label  = newVal ? "Graduar" : "Revocar graduación";
  const ok = await showModal(
    `${label}: ${name}`,
    newVal
      ? `¿Confirmas la graduación de ${name}? Aparecerá en el listado de Graduados del Colegio.`
      : `¿Revocar la graduación de ${name}? Volverá a su rango habitual.`,
    label, newVal ? "success" : "danger"
  );
  if (!ok) return;
  await setGraduated(name, newVal);
  toast(newVal ? `${name} graduado/a del Colegio 🎓` : `Graduación de ${name} revocada`, "success");
  renderProfile();
};

// =====================================================================
//  ADMIN — LOGIN
// =====================================================================
function applyAdminRole() {
  const secBtn = document.getElementById("tabSecurityBtn");
  if (secBtn) secBtn.style.display = isSuperAdmin ? "" : "none";
  // Sección de config: admin normal ve "Establecer superadmin", superadmin no
  const superSection = document.getElementById("superAdminPwdSection");
  if (superSection) superSection.style.display = isSuperAdmin ? "none" : "block";
}

window.loginAdmin = async function() {
  // const remaining = loginLockRemaining(); // Rate limiting deshabilitado
  // if (remaining > 0) {
  //   document.getElementById("adminErr").textContent =
  //     `Demasiados intentos. Espera ${remaining} minuto${remaining !== 1 ? "s" : ""}.`;
  //   document.getElementById("adminErr").style.display = "block";
  //   return;
  // }
  const btn = document.querySelector("#scAdminLogin .btn");
  if (btn) { btn.disabled = true; btn.textContent = "Verificando…"; }

  const password = document.getElementById("adminPwd").value;

  try {
    // Probar superadmin y admin con credenciales legacy
    let loginSuccess = false;
    let selectedRole = "admin";
    const salt = atob("bWVkaW1hZ2lh") + atob("X3N0dWRlbnRf") + atob("djFf");

    // Función para validar hash y hacer login
    const tryAdminLogin = async (role) => {
      // 1. Buscar credenciales legacy via RPC
      const { data: creds, error: credError } = await supabase
        .rpc("get_admin_hash", { p_role: role });

      if (credError || !creds) return false;

      // 2. Validar hash SHA-256
      const hashInput = salt + password;
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
      const receivedHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      if (receivedHash !== creds.hash) return false;

      // 3. Cambiar contraseña en auth.users via RPC
      const { data: resetData, error: resetError } = await supabase
        .rpc("reset_admin_password", { p_role: role, p_new_password: password });

      if (resetError || !resetData?.success) return false;

      // 4. Hacer login con Supabase Auth
      const emailSynthetic = `${role}@medimagia.test`;
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailSynthetic,
        password: password
      });

      return !loginError;
    };

    // Probar superadmin primero
    if (await tryAdminLogin("superadmin")) {
      loginSuccess = true;
      isSuperAdmin = true;
      isAdmin = true;
      selectedRole = "superadmin";
    } else if (await tryAdminLogin("admin")) {
      // Luego probar admin
      loginSuccess = true;
      isAdmin = true;
      isSuperAdmin = false;
      selectedRole = "admin";
    }

    if (!loginSuccess) {
      const errEl = document.getElementById("adminErr");
      errEl.textContent = "Contraseña incorrecta.";
      errEl.style.display = "block";
      if (btn) { btn.disabled = false; btn.textContent = "Entrar"; }
      return;
    }

    clearLoginLock();
    document.getElementById("adminPwd").value = "";
    const rememberAdmin = document.getElementById("adminRemember");
    if (rememberAdmin && rememberAdmin.checked) {
      saveSession({ kind: "admin", role: isSuperAdmin ? "superadmin" : "admin" });
    } else {
      clearSession();
    }

    applyAdminRole();
    updateAppHeader();
    show("scAdmin");
    await loadAllStudents();
    renderList(); renderAscensos(); renderGraduados();
    resetSessionTimer();
    if (!bitacorasLoaded) {
      loadBitacoras().then(() => { bitacorasLoaded = true; renderList(); }).catch(() => {});
    }
    if (btn) { btn.disabled = false; btn.textContent = "Entrar"; }
  } catch (err) {
    console.error("Admin login error:", err);
    // recordFailedLogin(); // Rate limiting deshabilitado
    const errEl = document.getElementById("adminErr");
    errEl.textContent = "Error al verificar credenciales.";
    errEl.style.display = "block";
    if (btn) { btn.disabled = false; btn.textContent = "Entrar"; }
  }
};

// =====================================================================
//  ADMIN — TABS
// =====================================================================
window.showTab = function(id) {
  show("scAdmin");
  document.querySelectorAll(".admin-section").forEach(el => el.className = "admin-section");
  document.querySelectorAll(".tab[data-tab]").forEach(el => {
    const t = el.getAttribute("data-tab");
    el.className = t === "tabSecurity" ? "tab tab-security" : "tab";
  });
  document.getElementById(id).className = "admin-section show";
  const btn = document.querySelector(`.tab[data-tab="${id}"]`);
  if (btn) btn.className += " active";
  if (id === "tabList")         renderList();
  if (id === "tabAscensos") {
    // Ensure bitácoras are loaded before rendering, so stats are available
    if (!bitacorasLoaded) {
      loadBitacoras().then(() => { bitacorasLoaded = true; renderAscensos(); }).catch(() => renderAscensos());
    } else {
      renderAscensos();
    }
  }
  if (id === "tabInventory")    renderInventory();
  if (id === "tabStats")        renderStats();
  if (id === "tabDirectory")    renderDirectoryIn("adminDirectoryContent");
  if (id === "tabActivity")     renderPocaActividad();
  if (id === "tabGrad")         renderGraduados();
  if (id === "tabRanks")        renderRanksEditor();
  if (id === "tabCredentials")  renderCredentialsOverview();
  if (id === "tabAttendance")   renderAttendanceTab();
  if (id === "tabSecurity")     { if (isSuperAdmin) renderSecurityTab(); }
};

// =====================================================================
//  ADMIN — LISTA DE ALUMNOS  (con ordenación)
// =====================================================================
let listSort = { key: "name", dir: 1 };

function bitCntMonth(name, y, m) {
  return allBitacoras.filter(b => {
    if (!b.attendants || !b.attendants.includes(name) || !b.createdAt) return false;
    const d = new Date(b.createdAt);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

function sortValue(n) {
  const sp  = allStudents[n];
  const rk  = getStudentRank(n);
  const pct = Math.round(allSpells().filter(s => sp[s]).length / allSpells().length * 100);
  if (listSort.key === "thisMonth") {
    const now = new Date();
    return bitCntMonth(n, now.getFullYear(), now.getMonth());
  }
  if (listSort.key === "lastMonth") {
    const now = new Date();
    const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return bitCntMonth(n, ly, lm);
  }
  switch (listSort.key) {
    case "pct":    return pct;
    case "status": return (!allGraduated[n] && canAscend(sp, rk)) ? 1 : 0;
    default:       return norm(n);
  }
}

window.sortList = function(key) {
  if (listSort.key === key) listSort.dir *= -1;
  else { listSort.key = key; listSort.dir = 1; }
  renderList();
};

function sortArrow(key) {
  if (listSort.key !== key) return `<span class="sort-arr">↕</span>`;
  return `<span class="sort-arr on">${listSort.dir === 1 ? "↑" : "↓"}</span>`;
}

window.quickGraduate = async function(name) {
  const grad   = allGraduated[name] || false;
  const newVal = !grad;
  const label  = newVal ? "Graduar del Colegio" : "Revocar graduación";
  const ok = await showModal(
    `${label}: ${name}`,
    newVal
      ? `¿Confirmas la graduación de ${name} del Colegio?`
      : `¿Revocar la graduación de ${name}? Volverá a su rango habitual.`,
    label, newVal ? "success" : "danger"
  );
  if (!ok) return;
  await setGraduated(name, newVal);
  toast(newVal ? `${name} graduado/a del Colegio 🎓` : `Graduación de ${name} revocada`, "success");
  renderList();
  renderGraduados();
};

function buildStudentCard(n) {
  const sp       = allStudents[n];
  const grad     = allGraduated[n] || false;
  const rk       = getStudentRank(n);
  const asc      = canAscend(sp, rk);
  const nextRk   = RANKS_ORDER[RANKS_ORDER.indexOf(rk) + 1];
  const allSp    = allSpells();
  const totPct   = Math.round(allSp.filter(s => sp[s]).length / allSp.length * 100);
  const rkSpells = RANKS[rk] || [];
  const rkDone   = rkSpells.filter(s => sp[s]).length;
  const rkPct    = rkSpells.length ? Math.round(rkDone / rkSpells.length * 100) : 0;
  const safe     = safeAttr(n);
  const rkIdx    = Math.max(0, RANKS_ORDER.indexOf(rk)) % RANK_PALETTE_SIZE;

  const statusHtml = grad
    ? `<span class="sc-status sc-status-grad">🎓 Graduado</span>`
    : (asc && nextRk ? `<span class="sc-status sc-status-apto">⬆ Apto</span>` : "");

  let bitsHtml;
  if (bitacorasLoaded) {
    const now = new Date();
    const ty = now.getFullYear(), tm = now.getMonth();
    const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
    const ct = bitCntMonth(n, ty, tm), cl = bitCntMonth(n, ly, lm);
    const mT = capitalize(new Date(ty, tm, 1).toLocaleDateString("es-ES", { month: "short" }));
    const mL = capitalize(new Date(ly, lm, 1).toLocaleDateString("es-ES", { month: "short" }));
    bitsHtml = `<span class="sc-bit-pill${ct < 3 ? " warn" : ""}">📋 ${mT}: <strong>${ct}</strong></span>
      <span class="sc-bit-pill${cl < 3 ? " warn" : ""}">📋 ${mL}: <strong>${cl}</strong></span>`;
  } else {
    bitsHtml = `<span class="sc-bit-pill sc-bit-loading">📋 —</span>`;
  }

  const gradBtnCls = `btn btn-grad sm${grad ? " is-grad" : ""}`;

  return `
  <div class="student-card sc-rank-i${rkIdx}${grad ? " sc-grad" : ""}">
    <div class="sc-header">
      <div class="sc-name">${escHtml(n)}</div>
      <div class="sc-badges">
        <span class="rank-badge ${rankClass("rk", rk)}">${escHtml(grad ? "Graduado" : rk)}</span>
        ${statusHtml}
      </div>
    </div>
    <div class="sc-progress-wrap">
      <div class="sc-progress-bar" style="width:${rkPct}%"></div>
    </div>
    <div class="sc-progress-labels">
      <span>${rkDone}/${rkSpells.length} hechizos — ${escHtml(rk)}</span>
      <span class="sc-total-pct">${totPct}% total</span>
    </div>
    <div class="sc-footer">
      <div class="sc-bits">${bitsHtml}</div>
      <div class="sc-actions">
        <button class="${gradBtnCls}" title="${grad ? "Revocar graduación" : "Graduar"}"
                onclick="quickGraduate('${safe}')">${grad ? "🎓 Revocar" : "🎓"}</button>
        ${asc && nextRk && !grad ? `<button class="btn sm success" onclick="adminAscend('${safe}')">⬆ ${escHtml(nextRk)}</button>` : ""}
        <button class="btn sm" onclick="adminEdit('${safe}')">Ver</button>
        <button class="btn sm cred-btn" onclick="showCredentials('${safe}')">🔑 <span class="cred-dot ${allCredentials[n] ? "on" : "off"}"></span></button>
        <button class="btn sm danger" onclick="adminDelete('${safe}')">✕</button>
      </div>
    </div>
  </div>`;
}

function buildRankTable(members) {
  return `<div class="students-grid">${members.map(buildStudentCard).join("")}</div>`;
}

function renderList() {
  const q = norm(document.getElementById("adminSearch").value || "");
  const allNames = Object.keys(allStudents).filter(n => !q || norm(n).includes(q));

  if (!allNames.length) {
    document.getElementById("adminListWrap").innerHTML =
      '<p class="empty-state">No se encontraron alumnos.</p>';
    return;
  }

  // Agrupar por rango — graduados se quedan en su rango
  const groups = {};
  for (const rk of RANKS_ORDER) groups[rk] = [];
  for (const n of allNames) groups[getStudentRank(n)].push(n);

  // Ordenar dentro de cada grupo con el sort activo
  const sorter = (a, b) => {
    const va = sortValue(a), vb = sortValue(b);
    if (va < vb) return -listSort.dir;
    if (va > vb) return  listSort.dir;
    return norm(a).localeCompare(norm(b));
  };
  for (const rk of RANKS_ORDER) groups[rk].sort(sorter);

  const html = RANKS_ORDER.map(rk => {
    const members = groups[rk];
    if (!members.length) return "";
    const count = members.length;
    return `<div class="rank-section">
      <div class="rank-section-header">
        <span class="rank-badge ${rankClass("rk", rk)}">${escHtml(rk)}</span>
        <span class="rank-count">${count} alumno${count !== 1 ? "s" : ""}</span>
      </div>
      ${buildRankTable(members)}
    </div>`;
  }).join("");

  const totalAll    = Object.keys(allStudents).length;
  const totalGrad   = Object.values(allGraduated).filter(Boolean).length;
  const totalActive = totalAll - totalGrad;
  const now2 = new Date();
  const ty2 = now2.getFullYear(), tm2 = now2.getMonth();
  const ly2 = tm2 === 0 ? ty2 - 1 : ty2, lm2 = tm2 === 0 ? 11 : tm2 - 1;
  const mT2 = capitalize(new Date(ty2, tm2, 1).toLocaleDateString("es-ES", { month: "short" }));
  const mL2 = capitalize(new Date(ly2, lm2, 1).toLocaleDateString("es-ES", { month: "short" }));

  const sortKeys = [
    { key: "name",      label: "Nombre"   },
    { key: "pct",       label: "% Total"  },
    { key: "status",    label: "Estado"   },
    { key: "thisMonth", label: `📋 ${mT2}` },
    { key: "lastMonth", label: `📋 ${mL2}` },
  ];
  const sortBar = `<div class="sort-bar">
    <span class="sort-bar-label">Orden:</span>
    ${sortKeys.map(s =>
      `<button class="sort-bar-btn${listSort.key === s.key ? " active" : ""}" onclick="sortList('${s.key}')">${s.label} ${sortArrow(s.key)}</button>`
    ).join("")}
  </div>`;

  const readyCount = Object.keys(allStudents).filter(n =>
    !allGraduated[n] && canAscend(allStudents[n], getStudentRank(n))).length;
  const lowActCount = bitacorasLoaded
    ? Object.keys(allStudents).filter(n => bitCntMonth(n, ly2, lm2) < 3).length
    : 0;

  const summary = `<div class="list-summary">
    <span class="list-summary-chip"><strong>${totalAll}</strong> total</span>
    <span class="list-summary-chip"><strong>${totalActive}</strong> sin graduar</span>
    <span class="list-summary-chip chip-grad"><strong>${totalGrad}</strong> graduados</span>
    ${readyCount ? `<button class="list-summary-chip chip-asc" onclick="showTab('tabAscensos')" title="Ver ascensos"><strong>${readyCount}</strong> ⬆ listos</button>` : ""}
    ${bitacorasLoaded && lowActCount ? `<button class="list-summary-chip chip-warn" onclick="showTab('tabActivity')" title="Ver actividad"><strong>${lowActCount}</strong> ⚠ baja actividad</button>` : ""}
  </div>`;

  document.getElementById("adminListWrap").innerHTML = summary + sortBar + html;
}

// =====================================================================
//  MIGRACIÓN DE RANGOS
// =====================================================================
window.migrateAllRanks = async function() {
  const names = Object.keys(allStudents);
  if (!names.length) { toast("No hay alumnos cargados.", "error"); return; }

  const btn = document.querySelector('[onclick="migrateAllRanks()"]');
  if (btn) { btn.disabled = true; btn.textContent = "Calculando…"; }

  let corrected = 0, unchanged = 0;
  const changes = [];

  for (const name of names) {
    const correct  = calcCorrectRank(allStudents[name]);
    const current  = allRanks[name] || RANKS_ORDER[0];
    if (correct !== current) {
      try {
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("name", name)
          .single();
        if (student?.id) {
          await supabase
            .from("students")
            .update({ current_rank: correct })
            .eq("id", student.id);
          changes.push(`${name}: ${current} → ${correct}`);
          allRanks[name] = correct;
          corrected++;
        }
      } catch (err) {
        console.error(`Error actualizando ${name}:`, err);
      }
    } else {
      unchanged++;
    }
  }

  if (btn) { btn.disabled = false; btn.textContent = "⚙ Recalcular y corregir todos los rangos"; }

  const okEl = document.getElementById("migrateOk");
  if (okEl) {
    okEl.style.display = "block";
    okEl.textContent   = corrected
      ? `✓ Corregidos ${corrected} alumno${corrected !== 1 ? "s" : ""}, ${unchanged} sin cambios.`
      : `✓ Todos los rangos ya eran correctos (${unchanged} alumnos revisados).`;
    setTimeout(() => { okEl.style.display = "none"; }, 6000);
  }

  if (corrected) {
    console.info("Rangos corregidos:", changes);
    renderList(); renderAscensos();
    toast(`Corregidos ${corrected} rangos`, "success");
  } else {
    toast("Todos los rangos son correctos", "success");
  }
};

// =====================================================================
//  DIRECTORIO DE MEDIMAGOS
// =====================================================================
let directoryFrom = null;

function renderDirectoryIn(containerId) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const names = Object.keys(allStudents).sort((a, b) => a.localeCompare(b, "es"));
  if (!names.length) { wrap.innerHTML = '<p class="empty-state">No hay medimagos registrados.</p>'; return; }

  const groups = {};
  for (const rk of RANKS_ORDER) groups[rk] = [];
  groups["Graduado"] = [];
  for (const n of names) {
    if (allGraduated[n]) groups["Graduado"].push(n);
    else groups[getStudentRank(n)].push(n);
  }

  const total = names.length;
  const grads = groups["Graduado"].length;
  let html = `<div class="dir-stats">
    <div class="dir-stat"><strong>${total}</strong> medimagos</div>
    ${grads ? `<div class="dir-stat highlight"><strong>${grads}</strong> graduados</div>` : ""}
  </div>`;

  for (const rk of [...RANKS_ORDER, "Graduado"]) {
    const members = groups[rk];
    if (!members.length) continue;
    const badgeCls = rankClass("rk", rk);
    const label    = rk === "Graduado" ? "🎓 Graduado" : rk;
    const rows = members.map(n => {
      const sp  = allStudents[n];
      const pct = Math.round(allSpells().filter(s => sp[s]).length / allSpells().length * 100);
      const initials = n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      return `<div class="dir-member">
        <div class="dir-avatar">${initials}</div>
        <span class="dir-name">${escHtml(n)}</span>
        <span class="dir-pct">${pct}%</span>
        ${allGraduated[n] ? '<span class="dir-grad-icon">🎓</span>' : ""}
      </div>`;
    }).join("");
    html += `<div class="dir-group">
      <div class="dir-group-header">
        <span class="rank-badge ${badgeCls}" style="font-size:.69rem">${label}</span>
        <span class="dir-count">${members.length}</span>
      </div>
      <div class="dir-members">${rows}</div>
    </div>`;
  }
  wrap.innerHTML = html;
}

window.showDirectory = function(from) {
  directoryFrom = from || "profile";
  renderDirectoryIn("directoryContent");
  show("scDirectory");
  const btn = document.getElementById("dirBackBtn");
  if (btn) btn.textContent = from === "admin" ? "← Volver al panel" : "← Volver a mi perfil";
};

window.backFromDirectory = function() {
  if (directoryFrom === "admin") show("scAdmin");
  else if (loggedInStudent) { renderProfile(); show("scProfile"); }
  else goSearch();
};

// =====================================================================
//  ADMIN — ASCENSOS
// =====================================================================
function renderAscensos() {
  const candidates = Object.keys(allStudents)
    .filter(n => RANKS_ORDER.indexOf(getStudentRank(n)) < RANKS_ORDER.length - 1)
    .sort((a, b) => {
      const aReady = RANKS[getStudentRank(a)].filter(s => !allStudents[a][s]).length <= ASCENSO_MISSING;
      const bReady = RANKS[getStudentRank(b)].filter(s => !allStudents[b][s]).length <= ASCENSO_MISSING;
      if (aReady !== bReady) return aReady ? -1 : 1;
      return norm(a).localeCompare(norm(b));
    });

  if (!candidates.length) {
    document.getElementById("ascTable").innerHTML =
      '<p class="empty-state">No hay alumnos pendientes de ascenso (están graduados o ya en el rango máximo).</p>';
    return;
  }

  const readyCount = candidates.filter(n =>
    RANKS[getStudentRank(n)].filter(s => !allStudents[n][s]).length <= ASCENSO_MISSING
  ).length;

  const cards = candidates.map(n => {
    const sp       = allStudents[n];
    const rk       = getStudentRank(n);
    const nextRk   = RANKS_ORDER[RANKS_ORDER.indexOf(rk) + 1];
    const rkSpells = RANKS[rk] || [];
    const missing  = rkSpells.filter(s => !sp[s]).length;
    const done     = rkSpells.length - missing;
    const rkPct    = rkSpells.length ? Math.round(done / rkSpells.length * 100) : 0;
    const ready    = missing <= ASCENSO_MISSING;
    const safe     = safeAttr(n);

    return `
    <div class="asc-card${ready ? " asc-ready" : ""}">
      <div class="asc-header">
        <div class="asc-name">${escHtml(n)}</div>
        <div class="asc-rank-row">
          <span class="rank-badge ${rankClass("rk", rk)}">${escHtml(rk)}</span>
          <span class="asc-arrow-icon">→</span>
          <span class="rank-badge ${rankClass("rk", nextRk)}">${escHtml(nextRk)}</span>
        </div>
      </div>
      <div class="asc-spell-wrap">
        <div class="asc-spell-fill${ready ? " asc-fill-ready" : ""}" style="width:${rkPct}%"></div>
      </div>
      <div class="asc-spell-labels">
        <span>${done}/${rkSpells.length} hechizos de ${escHtml(rk)}</span>
        <span class="${ready ? "asc-status-yes" : "asc-status-no"}">${ready
          ? "✓ Listo para ascender"
          : `Faltan ${missing} hechizo${missing !== 1 ? "s" : ""}`}</span>
      </div>
      <button class="btn success asc-btn" onclick="adminAscend('${safe}')">⬆ Ascender a ${escHtml(nextRk)}</button>
    </div>`;
  }).join("");

  const summary = readyCount
    ? `<div class="asc-summary asc-summary-ready"><strong>${readyCount}</strong> alumno${readyCount !== 1 ? "s" : ""} listo${readyCount !== 1 ? "s" : ""} para ascender</div>`
    : `<div class="asc-summary">Ningún alumno alcanza el mínimo aún</div>`;

  document.getElementById("ascTable").innerHTML = summary + `<div class="asc-grid">${cards}</div>`;
}

window.adminAscend = async function(name) {
  const rk      = getStudentRank(name);
  const nextRank = RANKS_ORDER[RANKS_ORDER.indexOf(rk) + 1];
  if (!nextRank) return;
  const sp      = allStudents[name] || {};
  const missing = RANKS[rk] ? RANKS[rk].filter(s => !sp[s]).length : 0;
  const extra   = missing > ASCENSO_MISSING
    ? ` Ten en cuenta que a este alumno le faltan ${missing} hechizos del rango actual — este ascenso es manual y se salta el requisito.`
    : "";
  const ok = await showModal(
    `Ascender a ${escHtml(name)}`,
    `¿Confirmas el ascenso de ${escHtml(name)} de ${escHtml(rk)} a ${escHtml(nextRank)}?${extra}`,
    "Ascender", "success"
  );
  if (!ok) return;
  try {
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("name", name)
      .single();
    if (!student?.id) throw new Error("Estudiante no encontrado");
    const { error } = await supabase
      .from("students")
      .update({ current_rank: nextRank })
      .eq("id", student.id);
    if (error) throw error;
  } catch (err) {
    toast(`Error al ascender: ${err?.code || err?.message || "desconocido"}`, "error");
    return;
  }
  allRanks[name] = nextRank;
  toast(`${name} ha ascendido a ${nextRank}`, "success");
  renderAscensos(); renderList();
};

// =====================================================================
//  ADMIN — GRADUADOS
// =====================================================================
function renderGraduados() {
  const grads = Object.keys(allStudents).filter(n => allGraduated[n]).sort();
  if (!grads.length) {
    document.getElementById("gradListWrap").innerHTML =
      '<p class="empty-state">Todavía no hay ningún graduado del colegio.</p>';
    return;
  }
  const cards = grads.map(n => {
    const sp  = allStudents[n];
    const all = allSpells();
    const pct = Math.round(all.filter(s => sp[s]).length / all.length * 100);
    const safe = safeAttr(n);
    return `<div class="grad-card-item">
      <span class="g-icon">🎓</span>
      <div class="g-name">${escHtml(n)}</div>
      <div class="g-rank">${pct}% completado</div>
      <div class="g-actions">
        <button class="btn sm" onclick="adminEdit('${safe}')">Ver</button>
        <button class="btn sm danger" onclick="adminDelete('${safe}')">Eliminar</button>
      </div>
    </div>`;
  }).join("");
  document.getElementById("gradListWrap").innerHTML =
    `<div class="grad-grid">${cards}</div>`;
}

// =====================================================================
//  ADMIN — POCA ACTIVIDAD
// =====================================================================
function buildActivityReport(year, month) {
  const monthName = capitalize(new Date(year, month, 1).toLocaleDateString("es-ES", { month: "long" }));

  const students = Object.keys(allStudents).map(n => ({
    name: n,
    rank: getStudentRank(n),
    count: bitCntMonth(n, year, month)
  }))
  .filter(s => s.count < 3 && !allGraduated[s.name])
  .sort((a, b) => a.count - b.count || norm(a.name).localeCompare(norm(b.name)));

  if (!students.length) {
    return `<div class="activity-empty"><p class="empty-state">✓ Todos tienen 3+ bitácoras en ${monthName}</p></div>`;
  }

  const rows = students.map(s => {
    const safe  = safeAttr(s.name);
    const rkCls = rankClass("rk", s.rank);
    return `<tr>
      <td>${escHtml(s.name)}</td>
      <td><span class="rank-badge ${rkCls}" style="font-size:.7rem">${escHtml(s.rank)}</span></td>
      <td style="text-align:center"><span class="bit-count-badge bit-count-warn">${s.count}</span></td>
      <td><button class="btn sm" onclick="adminEdit('${safe}')">Ver</button></td>
    </tr>`;
  }).join("");

  return `
    <div class="activity-section">
      <div class="activity-notice">
        <strong>${students.length}</strong> medimago${students.length !== 1 ? "s" : ""}
        con menos de 3 bitácoras en <strong>${monthName}</strong>
      </div>
      <table class="student-table">
        <thead><tr>
          <th>Nombre</th><th>Rango</th><th>📋 Bitácoras</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderPocaActividad() {
  const wrap = document.getElementById("activityWrap");
  if (!wrap) return;

  if (!bitacorasLoaded) {
    wrap.innerHTML = '<div class="loading"><span class="spinner"></span>Cargando bitácoras…</div>';
    loadBitacoras()
      .then(() => { bitacorasLoaded = true; renderPocaActividad(); renderList(); })
      .catch(() => {
        wrap.innerHTML = '<p class="notice" style="color:var(--red)">Error al cargar bitácoras.</p>';
      });
    return;
  }

  const now = new Date();
  const ty = now.getFullYear(), tm = now.getMonth();
  const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
  const mThisName = capitalize(new Date(ty, tm, 1).toLocaleDateString("es-ES", { month: "long" }));
  const mLastName = capitalize(new Date(ly, lm, 1).toLocaleDateString("es-ES", { month: "long" }));

  const students = Object.keys(allStudents).map(n => ({
    name: n,
    rank: getStudentRank(n),
    ct: bitCntMonth(n, ty, tm),
    cl: bitCntMonth(n, ly, lm)
  }))
  .filter(s => (s.cl < 3 || s.ct < 3) && !allGraduated[s.name])
  .sort((a, b) => (a.cl + a.ct) - (b.cl + b.ct) || norm(a.name).localeCompare(norm(b.name)));

  if (!students.length) {
    wrap.innerHTML = `<p class="empty-state">✓ Todos los medimagos tienen 3 o más bitácoras en ${mLastName} y ${mThisName}.</p>`;
    return;
  }

  const rows = students.map(s => {
    const safe  = safeAttr(s.name);
    const rkCls = rankClass("rk", s.rank);
    return `<tr>
      <td>${escHtml(s.name)}</td>
      <td><span class="rank-badge ${rkCls}" style="font-size:.7rem">${escHtml(s.rank)}</span></td>
      <td style="text-align:center"><span class="bit-count-badge${s.cl < 3 ? " bit-count-warn" : ""}">${s.cl}</span></td>
      <td style="text-align:center"><span class="bit-count-badge${s.ct < 3 ? " bit-count-warn" : ""}">${s.ct}</span></td>
      <td><button class="btn sm" onclick="adminEdit('${safe}')">Ver</button></td>
    </tr>`;
  }).join("");

  wrap.innerHTML = `
    <div class="activity-notice">
      <strong>${students.length}</strong> medimago${students.length !== 1 ? "s" : ""}
      con menos de 3 bitácoras en ${mLastName} o en ${mThisName}.
    </div>
    <table class="student-table">
      <thead><tr>
        <th>Nombre</th><th>Rango</th>
        <th>📋 ${mLastName} (pasado)</th>
        <th>📋 ${mThisName} (actual)</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// =====================================================================
//  ADMIN — ESTADÍSTICAS
// =====================================================================
function renderStats() {
  const wrap = document.getElementById("statsWrap");
  if (!wrap) return;

  if (!bitacorasLoaded) {
    wrap.innerHTML = '<div class="loading"><span class="spinner"></span>Cargando estadísticas…</div>';
    loadBitacoras()
      .then(() => { bitacorasLoaded = true; renderStats(); renderList(); })
      .catch(() => {
        wrap.innerHTML = '<p class="notice" style="color:var(--red)">Error al cargar bitácoras.</p>';
      });
    return;
  }

  const names    = Object.keys(allStudents);
  const totalAll = names.length;
  const grads    = names.filter(n => allGraduated[n]).length;
  const ready    = names.filter(n => !allGraduated[n] && canAscend(allStudents[n], getStudentRank(n))).length;
  const totalBits = allBitacoras.length;

  const now = new Date();
  const ty = now.getFullYear(), tm = now.getMonth();
  const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
  const bitsThisMonth = allBitacoras.filter(b => {
    if (!b.createdAt) return false;
    const d = new Date(b.createdAt);
    return d.getFullYear() === ty && d.getMonth() === tm;
  }).length;
  // Excluir graduados (igual que en los reportes de baja actividad)
  const lowAct = names.filter(n => !allGraduated[n] && bitCntMonth(n, ly, lm) < 3).length;

  // Bitácoras por mes — últimos 6 meses
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ty, tm - i, 1);
    const cnt = allBitacoras.filter(b => {
      if (!b.createdAt) return false;
      const x = new Date(b.createdAt);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
    }).length;
    months.push({ label: capitalize(d.toLocaleDateString("es-ES", { month: "short" })), cnt });
  }
  const maxM = Math.max(1, ...months.map(m => m.cnt));

  // Distribución por rango (graduados aparte)
  const dist = RANKS_ORDER.map(rk => ({
    rk, cnt: names.filter(n => !allGraduated[n] && getStudentRank(n) === rk).length
  }));
  dist.push({ rk: "🎓 Graduados", cnt: grads });
  const maxD = Math.max(1, ...dist.map(d => d.cnt));

  // Medimagos más activos (total de bitácoras)
  const medCount = {};
  allBitacoras.forEach(b => (b.attendants || []).forEach(a => medCount[a] = (medCount[a] || 0) + 1));
  const topMed = Object.entries(medCount).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxMed = Math.max(1, ...topMed.map(t => t[1]));

  // Pacientes más atendidos
  const patCount = {};
  allBitacoras.forEach(b => { if (b.patient) patCount[b.patient] = (patCount[b.patient] || 0) + 1; });
  const topPat = Object.entries(patCount).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxPat = Math.max(1, ...topPat.map(t => t[1]));

  const hbar = (label, n, max, cls = "") => `<div class="hbar-row">
    <span class="hbar-label" title="${escHtml(label)}">${escHtml(label)}</span>
    <div class="hbar-track"><div class="hbar-fill ${cls}" style="width:${Math.round(n / max * 100)}%"></div></div>
    <span class="hbar-num">${n}</span>
  </div>`;

  wrap.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-num">${totalAll}</div><div class="stat-label">Medimagos</div></div>
      <div class="stat-card"><div class="stat-num">${grads}</div><div class="stat-label">Graduados</div></div>
      <div class="stat-card"><div class="stat-num stat-green">${ready}</div><div class="stat-label">Listos p. ascender</div></div>
      <div class="stat-card"><div class="stat-num">${totalBits}</div><div class="stat-label">Bitácoras totales</div></div>
      <div class="stat-card"><div class="stat-num">${bitsThisMonth}</div><div class="stat-label">Bitácoras este mes</div></div>
      <div class="stat-card"><div class="stat-num${lowAct ? " stat-warn" : ""}">${lowAct}</div><div class="stat-label">Baja actividad</div></div>
    </div>
    <div class="stats-panels">
      <div class="stats-panel">
        <p class="stats-panel-title">📋 Bitácoras por mes (últimos 6)</p>
        <div class="chart-bars">${months.map(m => `
          <div class="chart-col">
            <span class="chart-col-num">${m.cnt}</span>
            <div class="chart-col-bar"><div class="chart-col-fill" style="height:${Math.max(2, Math.round(m.cnt / maxM * 100))}%"></div></div>
            <span class="chart-col-label">${m.label}</span>
          </div>`).join("")}
        </div>
      </div>
      <div class="stats-panel">
        <p class="stats-panel-title">🎖 Distribución por rango</p>
        ${dist.map(d => hbar(d.rk, d.cnt, maxD)).join("")}
      </div>
      <div class="stats-panel">
        <p class="stats-panel-title">⚕ Medimagos más activos</p>
        ${topMed.length ? topMed.map(([n, c]) => hbar(n, c, maxMed, "hbar-green")).join("") : '<p class="empty-state">Sin datos aún.</p>'}
      </div>
      <div class="stats-panel">
        <p class="stats-panel-title">🤕 Pacientes más atendidos</p>
        ${topPat.length ? topPat.map(([n, c]) => hbar(n, c, maxPat, "hbar-red")).join("") : '<p class="empty-state">Sin datos aún.</p>'}
      </div>
    </div>

    <div class="stats-divider"></div>

    <div class="activity-header" style="margin-top:2rem">
      <p class="activity-title">⚠️ Medimagos con baja actividad</p>
      <p style="font-size:.85rem;color:var(--text-muted);margin-top:.4rem">Estudiantes con menos de 3 bitácoras en cada mes (excluye graduados)</p>
    </div>
    ${buildActivityReport(ty, 4)}
    ${buildActivityReport(ty, 5)}`;
}

// =====================================================================
//  ADMIN — CREDENCIALES (resumen)
// =====================================================================
function renderCredentialsOverview() {
  const wrap = document.getElementById("credentialsWrap");
  if (!wrap) return;

  const names = Object.keys(allStudents).sort((a, b) =>
    norm(a).localeCompare(norm(b))
  );

  const withCreds = names.filter(n => allCredentials[n]?.username).length;
  const total = names.length;
  const pct = Math.round(withCreds / total * 100);

  const rows = names.map(n => {
    const cred = allCredentials[n];
    const hasPassword = cred?.username ? true : false;
    const username = cred?.username || "—";
    const rank = getStudentRank(n);
    const rkCls = rankClass("rk", rank);
    const safe = safeAttr(n);

    return `<tr>
      <td>${escHtml(n)}</td>
      <td><span class="rank-badge ${rkCls}" style="font-size:.7rem">${escHtml(rank)}</span></td>
      <td><code class="cred-username">${escHtml(username)}</code></td>
      <td style="text-align:center">
        <span class="cred-status ${hasPassword ? "has-password" : "no-password"}">
          ${hasPassword ? "✓ Sí" : "✗ No"}
        </span>
      </td>
      <td>
        <button class="btn sm" onclick="showCredentials('${safe}')">🔑 Ver</button>
      </td>
    </tr>`;
  }).join("");

  wrap.innerHTML = `
    <div class="creds-summary">
      <div class="creds-stat">
        <div class="creds-stat-num">${withCreds}/${total}</div>
        <div class="creds-stat-label">Con credenciales</div>
      </div>
      <div class="creds-stat">
        <div class="creds-stat-num">${pct}%</div>
        <div class="creds-stat-label">Cobertura</div>
      </div>
    </div>

    <table class="student-table" style="margin-top:1.2rem">
      <thead><tr>
        <th>Nombre</th>
        <th>Rango</th>
        <th>Usuario</th>
        <th>Contraseña</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

window.renderCredentialsOverview = renderCredentialsOverview;
window.adminEdit   = function(name) { openProfile(name); };
window.adminDelete = async function(name) {
  const ok = await showModal(
    "Eliminar alumno",
    `¿Seguro que quieres eliminar a ${name}? Esta acción no se puede deshacer y lo borrará permanentemente de la base de datos.`,
    "Eliminar", "danger"
  );
  if (!ok) return;
  try {
    await deleteStudent(name);
  } catch (err) {
    console.error("Error eliminando alumno:", err);
    const detail = [err?.message, err?.details, err?.hint].filter(Boolean).join(" · ")
                   || err?.code || "error desconocido";
    toast(`No se pudo eliminar: ${detail}`, "error");
    return;
  }
  toast(`${name} eliminado de la base de datos`, "success");
  renderList(); renderAscensos(); renderGraduados(); renderDirectoryIn("directoryContent");
};

// =====================================================================
//  ADMIN — CREDENCIALES DE ALUMNOS
// =====================================================================
//  COPY TO CLIPBOARD
// =====================================================================
window.copyToClipboard = function(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "✓ Copiado";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "Copiar"; btn.classList.remove("copied"); }, 2000);
  }).catch(() => {
    toast("No se pudo copiar al portapapeles", "error");
  });
};

// =====================================================================
let currentCredStudent = null;

window.showCredentials = function(name) {
  currentCredStudent = name;
  const cred   = allCredentials[name];
  const title  = document.getElementById("credModalTitle");
  const body   = document.getElementById("credModalBody");
  const genBtn = document.getElementById("credModalGenBtn");

  title.textContent    = `Credenciales — ${name}`;
  genBtn.style.display = "inline-flex";
  genBtn.textContent   = cred ? "Regenerar contraseña" : "Generar credenciales";

  if (cred) {
    body.innerHTML = `
      <p class="cred-note">Este alumno ya tiene acceso al sistema.</p>
      <div class="cred-row">
        <span class="cred-label">Usuario</span>
        <code class="cred-val">${escHtml(cred.username)}</code>
        <button class="cred-copy-btn" onclick="copyToClipboard(this,'${safeAttr(cred.username)}')">Copiar</button>
      </div>
      <p class="cred-note" style="margin-top:.7rem;font-size:.8rem">
        La contraseña no se puede recuperar. Puedes generar una nueva contraseña y comunicársela al alumno.
      </p>`;
  } else {
    body.innerHTML = `<p class="cred-note">Este alumno aún no tiene credenciales de acceso.<br>
      Pulsa <em>Generar credenciales</em> para crear su usuario y contraseña.</p>`;
  }

  document.getElementById("credModal").classList.add("show");
};

window.closeCredModal = function() {
  document.getElementById("credModal").classList.remove("show");
  currentCredStudent = null;
};

window.doGenerateCredentials = async function() {
  const name = currentCredStudent;
  if (!name) return;

  const existing = allCredentials[name];
  let username   = existing ? existing.username : generateUniqueUsername(name);

  const password = generatePassword();

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("No hay sesión de administrador activa. Cierra sesión y vuelve a entrar como admin.");

    const res = await fetch(`${SUPABASE_SERVICE_FUNCTION_URL}/create-student-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({ name, username, password })
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.success) {
      throw new Error(result.error || `Error HTTP ${res.status}`);
    }

    username = result.username || username;

    if (existing && existing.username !== username) {
      delete usernameIndex[(existing.username || "").toLowerCase()];
    }
    allCredentials[name] = {
      username,
      passwordHash: result.password_hash || "auth",
      authUserId: result.auth_user_id || null,
      credentialsUpdatedAt: result.credentials_updated_at || new Date().toISOString()
    };
    usernameIndex[username.toLowerCase()] = name;
  } catch (err) {
    console.error("Error guardando credenciales:", err);
    toast(`Error al crear usuario: ${err?.message || "desconocido"}`, "error");
    return;
  }

  const body   = document.getElementById("credModalBody");
  const genBtn = document.getElementById("credModalGenBtn");
  body.innerHTML = `
    <p class="cred-warn">⚠ Guarda esta contraseña ahora. No podrás verla de nuevo.</p>
    <div class="cred-row">
      <span class="cred-label">Usuario</span>
      <code class="cred-val" id="credValUser">${escHtml(username)}</code>
      <button class="cred-copy-btn" onclick="copyToClipboard(this,'${safeAttr(username)}')">Copiar</button>
    </div>
    <div class="cred-row">
      <span class="cred-label">Contraseña</span>
      <code class="cred-val" id="credValPwd">${escHtml(password)}</code>
      <button class="cred-copy-btn" onclick="copyToClipboard(this,'${safeAttr(password)}')">Copiar</button>
    </div>`;
  genBtn.style.display = "none";
  renderCredentialsOverview();
  toast(existing ? "✓ Contraseña regenerada y guardada" : "✓ Usuario creado y contraseña guardada", "success");
};

document.getElementById("credModal")
  .addEventListener("click", e => { if (e.target === e.currentTarget) closeCredModal(); });

// =====================================================================
//  ADMIN — CREAR ALUMNO
// =====================================================================
let selectedRank = null;
let addSpells    = {};

window.selectRankOpt = function(el) {
  document.querySelectorAll(".rank-opt").forEach(o => o.className = "rank-opt");
  const rank = el.dataset.rank;
  if (selectedRank === rank) {
    selectedRank = null; addSpells = {};
    document.getElementById("spellEditorWrap").style.display = "none";
    return;
  }
  el.className = `rank-opt ${rankClass("sel", rank)}`;
  selectedRank = rank;
  addSpells = {};
  allSpells().forEach(s => addSpells[s] = false);
  const idx = RANKS_ORDER.indexOf(rank);
  for (let i = 0; i < idx; i++) RANKS[RANKS_ORDER[i]].forEach(s => addSpells[s] = true);
  buildSpellEditor();
  document.getElementById("spellEditorWrap").style.display = "block";
};

function buildSpellEditor() {
  document.getElementById("spellEditor").innerHTML = RANKS_ORDER.map(rk =>
    `<div class="spell-group-label">${escHtml(rk)}</div>` +
    RANKS[rk].map(s => {
      const key = "addchk_" + domKey(s);
      return `<label class="spell-check-row">
        <input type="checkbox" id="${key}" ${addSpells[s] ? "checked" : ""}
               onchange="toggleAddSpell('${safeAttr(s)}', this.checked)"/>
        ${escHtml(s)}
      </label>`;
    }).join("")
  ).join("");
}

window.toggleAddSpell = function(s, val) { addSpells[s] = val; };

window.resetAddForm = function() {
  document.getElementById("newName").value = "";
  document.getElementById("addErr").style.display = "none";
  document.getElementById("addOk").style.display  = "none";
  document.querySelectorAll(".rank-opt").forEach(o => o.className = "rank-opt");
  selectedRank = null; addSpells = {};
  document.getElementById("spellEditorWrap").style.display = "none";
};

window.addAlumno = async function() {
  const name  = document.getElementById("newName").value.trim();
  const errEl = document.getElementById("addErr");
  const okEl  = document.getElementById("addOk");
  errEl.style.display = "none"; okEl.style.display = "none";

  if (!name) {
    errEl.textContent = "Escribe un nombre."; errEl.style.display = "block"; return;
  }
  if (name.length > 80) {
    errEl.textContent = "El nombre no puede superar los 80 caracteres."; errEl.style.display = "block"; return;
  }
  if (allStudents[name]) {
    errEl.textContent = "Ya existe un alumno con ese nombre."; errEl.style.display = "block"; return;
  }

  const spells = selectedRank ? { ...addSpells } : {};
  if (!selectedRank) allSpells().forEach(s => spells[s] = false);

  try {
    await createStudent(name, spells);
  } catch (err) {
    console.error("Error creando alumno:", err);
    errEl.textContent = `Error al crear alumno: ${err?.code || err?.message || "desconocido"}`;
    errEl.style.display = "block";
    return;
  }

  okEl.style.display = "block";
  toast(`Alumno "${name}" creado`, "success");
  setTimeout(() => okEl.style.display = "none", 2500);
  resetAddForm();
  renderList();
  renderAscensos();
  renderGraduados();
  renderCredentialsOverview();
  renderDirectoryIn("directoryContent");
};

// =====================================================================
//  BITÁCORAS (pantalla pública)
// =====================================================================
let allBitacoras      = [];
let bitacorasFrom     = "search";
let bitacorasLoaded   = false;
let bitacorasPage     = 0;
const BITS_PER_PAGE   = 3;
let editingBitacoraId = null;
let bitacoraQuery     = "";

window.showBitacoras = async function(from = "search") {
  if (!isAdmin && !loggedInStudent) { goSearch(); return; }
  try {
    bitacorasFrom = from;
    show("scBitacoras");

    if (!bitacorasLoaded) {
      document.getElementById("bitacoraListWrap").innerHTML =
        '<div class="loading"><span class="spinner"></span>Cargando bitácoras…</div>';
      document.getElementById("attendantsList").innerHTML = buildAttendantsList();
      document.getElementById("spellInserter").innerHTML  = buildSpellInserter();
      try {
        await loadBitacoras();
        bitacorasLoaded = true;
      } catch (e) {
        console.error("Error cargando bitácoras:", e);
        document.getElementById("bitacoraListWrap").innerHTML =
          `<p class="notice" style="color:var(--red)">
            No se pudieron cargar las bitácoras.<br>
            <small>Comprueba las reglas de Firestore: la colección <em>bitacoras</em> necesita permisos de lectura.</small>
          </p>`;
        return;
      }
    }

    renderBitacoraList();
  } catch (e) {
    console.error("showBitacoras error:", e);
    toast("Error al abrir bitácoras. Revisa la consola.", "error");
  }
};

window.backFromBitacoras = function() {
  if (bitacorasFrom === "admin") show("scAdmin");
  else if (loggedInStudent) show("scProfile");
  else goSearch();
};

async function loadBitacoras() {
  try {
    const { data: bitacoras, error } = await supabase
      .from("bitacoras")
      .select(`
        *,
        bitacora_attendants(attendant_name),
        bitacora_potions(potion_id),
        bitacora_edit_history(editor, edited_at, edit_number)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando bitácoras:", error);
      return;
    }

    allBitacoras = (bitacoras || []).map(b => ({
      id: b.id,
      patient: b.patient,
      diagnosis: b.diagnosis,
      procedure: b.procedure,
      createdAt: b.created_at,
      createdBy: b.created_by,
      // Dedup defensivo: si la BD tuviera filas de asistente duplicadas no
      // deben inflar el conteo por medimago (cada uno cuenta una vez por bitácora)
      attendants: [...new Set((b.bitacora_attendants || []).map(a => a.attendant_name))],
      potionsUsed: [...new Set((b.bitacora_potions || []).map(p => p.potion_id))],
      editHistory: (b.bitacora_edit_history || [])
        .map(e => ({ editor: e.editor, editedAt: e.edited_at, editNumber: e.edit_number }))
        .sort((x, y) => x.editNumber - y.editNumber)
    }));

    updatePatientDatalist();
  } catch (err) {
    console.error("Error en loadBitacoras:", err);
  }
}

function updatePatientDatalist() {
  const dl = document.getElementById("patientsList");
  if (!dl) return;
  const fromBitacoras = allBitacoras.map(b => b.patient).filter(Boolean);
  const fromStudents  = Object.keys(allStudents);
  const names = [...new Set([...fromBitacoras, ...fromStudents])].sort();
  dl.innerHTML = names.map(n => `<option value="${escHtml(n)}"></option>`).join("");
}

// ── Insertor de hechizos ──────────────────────────────────────────────
function buildSpellInserter(targetId = "bitProc") {
  const groups = RANKS_ORDER.map(rk =>
    `<div class="si-group">
      <span class="si-rank">${escHtml(rk)}</span>
      <div class="si-spells">
        ${RANKS[rk].map(s =>
          `<button class="si-btn" type="button" onclick="insertSpellTo('${targetId}','${safeAttr(s)}')">${escHtml(s)}</button>`
        ).join("")}
      </div>
    </div>`
  ).join("");
  return `<div class="si-label">Insertar hechizo:</div>${groups}`;
}

window.insertSpellTo = function(targetId, spell) {
  const ta  = document.getElementById(targetId);
  const pos = ta.selectionStart;
  const pre = ta.value.substring(0, pos);
  const suf = ta.value.substring(ta.selectionEnd);
  const sep = pre && !pre.endsWith(" ") && !pre.endsWith("\n") ? " " : "";
  ta.value  = pre + sep + spell + suf;
  ta.focus();
  const cur = pos + sep.length + spell.length;
  ta.selectionStart = ta.selectionEnd = cur;
};
window.insertSpell = function(spell) { insertSpellTo("bitProc", spell); };

// ── Lista de asistentes (de la BD) ───────────────────────────────────
// La selección vive en memoria (no en el DOM): así no se pierde al filtrar,
// y los marcados se muestran siempre al principio aunque no coincidan con la búsqueda.
let selectedAttendants = new Set();

function buildAttendantsList(filterQ = "") {
  const names = Object.keys(allStudents).sort();
  // Auto-seleccionar al usuario logueado
  if (loggedInStudent && allStudents[loggedInStudent] && !selectedAttendants.has(loggedInStudent)) {
    selectedAttendants.add(loggedInStudent);
  }
  const item = (n, checked, missing = false) =>
    `<label class="attendant-item${checked ? " attendant-item-sel" : ""}${missing ? " attendant-item-missing" : ""}${n === loggedInStudent ? " attendant-item-me" : ""}">
      <input type="checkbox" class="att-chk" value="${escHtml(n)}" ${checked ? "checked" : ""}
             onchange="toggleAttendant(this.value, this.checked)"/> ${escHtml(n)}${missing ? ' <span class="att-missing">⚠️ usuario no existe</span>' : ''}${n === loggedInStudent ? ' <span class="att-you">• tú</span>' : ""}
    </label>`;
  // Asistentes seleccionados que NO existen en la BD
  const missingAttendants = [...selectedAttendants].filter(n => !allStudents[n]).sort();
  // Marcados: siempre visibles, ignoran el filtro
  const checkedNames = names.filter(n => selectedAttendants.has(n));
  const others = names.filter(n =>
    !selectedAttendants.has(n) && (!filterQ || norm(n).includes(norm(filterQ)))
  );

  const missingHtml = missingAttendants.map(n => item(n, true, true)).join("");
  const existingHtml = checkedNames.map(n => item(n, true)).join("") +
                       others.map(n => item(n, false)).join("");

  if (!missingAttendants.length && !checkedNames.length && !others.length)
    return '<p style="color:#4a4540;font-size:.8rem;padding:.4rem">No hay medimagos en la base de datos.</p>';
  return missingHtml + existingHtml;
}

window.toggleAttendant = function(name, checked) {
  if (checked) selectedAttendants.add(name);
  else         selectedAttendants.delete(name);
  // Re-render para que el marcado suba a la zona de "siempre visibles"
  const q = document.getElementById("attendantSearch").value;
  document.getElementById("attendantsList").innerHTML = buildAttendantsList(q);
};

window.filterAttendants = function() {
  const q = document.getElementById("attendantSearch").value;
  document.getElementById("attendantsList").innerHTML = buildAttendantsList(q);
};

window.resetBitacoraForm = function() {
  ["bitPatient","bitDiag","bitProc","attendantSearch"].forEach(id =>
    document.getElementById(id).value = "");
  document.getElementById("bitErr").style.display = "none";
  document.getElementById("bitOk").style.display  = "none";
  selectedAttendants.clear();
  selectedPotions.clear();
  document.getElementById("attendantsList").innerHTML = buildAttendantsList();
  document.getElementById("potionsSelected").innerHTML = "";
};

// Guard de reentrada: evita guardados duplicados por doble clic o latencia
// (el clic durante la espera de 1500 ms o durante el insert crearía 2 bitácoras)
let bitacoraSaving = false;
window.saveBitacoraEntry = async function() {
  if (bitacoraSaving) return;
  bitacoraSaving = true;
  const saveBtn = document.getElementById("saveBitBtn");
  if (saveBtn) saveBtn.disabled = true;
  try {
    await doSaveBitacoraEntry();
  } finally {
    bitacoraSaving = false;
    if (saveBtn) saveBtn.disabled = false;
  }
};
// Devuelve solo las pociones que existen en la tabla `potions` (la FK
// bitacora_potions.potion_id las exige). Comprueba EXISTENCIA, no verdad:
// qty puede ser 0 (falsy) y la poción seguir existiendo. Si el inventario
// no está cargado lo carga; si no se puede cargar, no filtra (confía en el
// seed de BD) para no descartar pociones válidas por error.
async function filterExistingPotions(ids) {
  if (!ids.length) return { valid: [], dropped: 0 };
  if (!Object.keys(allInventory).length) { try { await loadInventory(); } catch {} }
  if (!Object.keys(allInventory).length) return { valid: [...ids], dropped: 0 };
  const valid = ids.filter(id => id in allInventory);
  return { valid, dropped: ids.length - valid.length };
}

async function doSaveBitacoraEntry() {
  const patient    = document.getElementById("bitPatient").value.trim();
  const diagnosis  = document.getElementById("bitDiag").value.trim();
  const procedure  = document.getElementById("bitProc").value.trim();
  const attendants = [...selectedAttendants].filter(n => allStudents[n]);
  if (loggedInStudent && !attendants.includes(loggedInStudent)) attendants.push(loggedInStudent);
  let potionsUsed = [...selectedPotions];
  const errEl = document.getElementById("bitErr");
  const okEl  = document.getElementById("bitOk");
  errEl.style.display = "none"; okEl.style.display = "none";

  if (!patient)           { errEl.textContent = "El nombre del paciente es obligatorio."; errEl.style.display = "block"; return; }
  if (!diagnosis)         { errEl.textContent = "El diagnóstico es obligatorio.";          errEl.style.display = "block"; return; }
  if (!procedure)         { errEl.textContent = "El procedimiento es obligatorio.";         errEl.style.display = "block"; return; }
  if (!attendants.length) { errEl.textContent = "Selecciona al menos un medimago.";         errEl.style.display = "block"; return; }
  if (attendants.length < selectedAttendants.size) {
    errEl.textContent = `⚠️ ${selectedAttendants.size - attendants.length} asistente(s) no existen. Se guardarán solo los que existen.`;
    errEl.style.display = "block";
    await new Promise(r => setTimeout(r, 1500));
  }
  if (patient.length > 80 || diagnosis.length > 200 || procedure.length > 5000) {
    errEl.textContent = "Texto demasiado largo (paciente ≤80, diagnóstico ≤200, procedimiento ≤5000 caracteres).";
    errEl.style.display = "block"; return;
  }
  // Descartar pociones que no existen en la tabla `potions` (evita FK 23503)
  {
    const { valid, dropped } = await filterExistingPotions(potionsUsed);
    potionsUsed = valid;
    if (dropped) {
      errEl.textContent = `⚠️ ${dropped} poción(es) no están en el inventario y se omitirán. Pide a un admin que las añada.`;
      errEl.style.display = "block";
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const now = new Date().toISOString();

  try {
    // Insertar bitácora
    const { data: bitacora, error: bitError } = await supabase
      .from("bitacoras")
      .insert({
        patient, diagnosis, procedure,
        created_at: now,
        created_by: loggedInStudent || "Sistema",
        source_firestore_id: `bit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
      .select()
      .single();

    if (bitError || !bitacora) throw bitError || new Error("No se pudo crear bitácora");

    // Insertar attendants (en lote, con control de error)
    if (attendants.length) {
      const { error: attErr } = await supabase
        .from("bitacora_attendants")
        .insert(attendants.map(name => ({
          bitacora_id: bitacora.id,
          attendant_name: name,
          student_id: null
        })));
      if (attErr) throw attErr;
    }

    // Insertar potions (en lote, con control de error)
    if (potionsUsed.length) {
      const { error: potErr } = await supabase
        .from("bitacora_potions")
        .insert(potionsUsed.map(pid => ({
          bitacora_id: bitacora.id,
          potion_id: pid,
          qty: 1
        })));
      if (potErr) throw potErr;

      // Restar del inventario (BD + memoria local)
      for (const potionId of potionsUsed) {
        const newQty = Math.max(0, (allInventory[potionId] || 0) - 1);
        allInventory[potionId] = newQty;
        await supabase.from("potions").update({ qty: newQty }).eq("id", potionId);
      }
    }

    // Insertar edit history (entrada #1)
    const { error: histErr } = await supabase
      .from("bitacora_edit_history")
      .insert({
        bitacora_id: bitacora.id,
        editor: loggedInStudent || "Sistema",
        edited_at: now,
        edit_number: 1
      });
    if (histErr) throw histErr;

    allBitacoras.unshift({
      id: bitacora.id,
      patient, diagnosis, procedure,
      createdAt: now,
      createdBy: loggedInStudent || "Sistema",
      attendants, potionsUsed,
      editHistory: [{ editor: loggedInStudent || "Sistema", editedAt: now, editNumber: 1 }]
    });

    bitacorasPage = 0;
    toast("Bitácora guardada", "success");
    okEl.style.display = "block";
    setTimeout(() => okEl.style.display = "none", 2500);
    resetBitacoraForm();
    updatePatientDatalist();
    renderBitacoraList();
  } catch (err) {
    console.error("Error guardando bitácora:", err);
    toast(`Error al guardar: ${err?.message || "desconocido"}`, "error");
  }
}

window.deleteBitacora = async function(id) {
  const ok = await showModal("Eliminar bitácora",
    "¿Seguro que quieres eliminar esta bitácora? No se puede deshacer.",
    "Eliminar", "danger");
  if (!ok) return;

  try {
    const { error } = await supabase
      .from("bitacoras")
      .delete()
      .eq("id", id);

    if (error) throw error;

    allBitacoras = allBitacoras.filter(b => b.id !== id);
    toast("Bitácora eliminada");
    renderBitacoraList();
    // Refrescar la vista de Personas si la eliminación se lanzó desde ahí
    if (currentScreen === "scPersonas") {
      renderPersonasList();
      if (selectedPersona) {
        if (getPersonaBitacoras(selectedPersona).length) renderPersonaBitacoras();
        else { selectedPersona = null; document.getElementById("personaBitacorasWrap").style.display = "none"; }
      }
    }
  } catch (err) {
    console.error("Error eliminando bitácora:", err);
    toast("Error al eliminar", "error");
  }
};

// Sección "Ediciones" de una tarjeta de bitácora.
// La primera entrada del historial es la línea base (creación) y no se muestra;
// el resto son ediciones reales, renumeradas desde 1 para mostrar.
// Se omite la base por posición (no por número) para soportar datos migrados
// que no tengan una entrada de creación.
function editHistoryField(b) {
  const sorted = [...(b.editHistory || [])].sort((x, y) => (x.editNumber || 0) - (y.editNumber || 0));
  const edits = sorted.slice(1); // descartar la línea base
  if (!edits.length) return "";
  return `
      <div class="bitacora-field">
        <span class="bitacora-label">Ediciones</span>
        <div class="bitacora-edits">
          ${edits.map((edit, i) => `
            <div class="bitacora-edit-entry">
              <span class="edit-num">Edición ${i + 1}:</span>
              <span class="edit-info">${escHtml(edit.editor)} · ${formatDate(edit.editedAt)}</span>
            </div>
          `).join("")}
        </div>
      </div>`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function renderBitacoraList() {
  const wrap = document.getElementById("bitacoraListWrap");
  if (!allBitacoras.length) {
    wrap.innerHTML = '<p class="empty-state">Todavía no hay ninguna bitácora registrada.</p>';
    return;
  }

  const q    = norm(bitacoraQuery);
  const list = q ? allBitacoras.filter(b =>
        norm(b.patient   || "").includes(q) ||
        norm(b.diagnosis || "").includes(q) ||
        norm(b.procedure || "").includes(q) ||
        (b.attendants || []).some(a => norm(a).includes(q))
      ) : allBitacoras;

  if (!list.length) {
    wrap.innerHTML = `<p class="empty-state">No hay bitácoras que coincidan con “${escHtml(bitacoraQuery)}”.</p>`;
    return;
  }

  const total      = list.length;
  const totalPages = Math.ceil(total / BITS_PER_PAGE);
  bitacorasPage    = Math.max(0, Math.min(bitacorasPage, totalPages - 1));
  const start      = bitacorasPage * BITS_PER_PAGE;
  const pageItems  = list.slice(start, start + BITS_PER_PAGE);

  const cardsHtml = pageItems.map(b => {
    const canEdit = isAdmin || (loggedInStudent && (b.attendants || []).includes(loggedInStudent));
    const btns = (canEdit || isAdmin) ? `
      <div style="display:flex;gap:.4rem;flex-shrink:0;margin-left:.5rem">
        ${canEdit ? `<button class="btn sm" onclick="openEditBitacora('${b.id}')">Editar</button>` : ""}
        ${isAdmin ? `<button class="btn sm danger" onclick="deleteBitacora('${b.id}')">Eliminar</button>` : ""}
      </div>` : "";
    return `
    <div class="bitacora-card">
      <div class="bitacora-top">
        <div>
          <div class="bitacora-patient">${escHtml(b.patient)}</div>
          <div class="bitacora-date">${formatDate(b.createdAt)}</div>
        </div>
        ${btns}
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Diagnóstico</span>
        <span class="bitacora-value">${escHtml(b.diagnosis)}</span>
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Procedimiento</span>
        <span class="bitacora-value bitacora-proc">${escHtml(b.procedure)}</span>
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Atendido por</span>
        <div class="bitacora-attendants">${(b.attendants || []).map(a =>
          `<span class="att-badge">${escHtml(a)}</span>`).join("")}</div>
      </div>
      ${editHistoryField(b)}
    </div>`;
  }).join("");

  let paginationHtml = "";
  if (totalPages > 1) {
    const pageBtns = Array.from({ length: totalPages }, (_, i) =>
      `<button class="page-btn${i === bitacorasPage ? " active" : ""}" onclick="setBitacorasPage(${i})">${i + 1}</button>`
    ).join("");
    paginationHtml = `
      <div class="pagination">
        <button class="page-btn" onclick="setBitacorasPage(${bitacorasPage - 1})" ${bitacorasPage === 0 ? "disabled" : ""}>&#8592;</button>
        ${pageBtns}
        <button class="page-btn" onclick="setBitacorasPage(${bitacorasPage + 1})" ${bitacorasPage >= totalPages - 1 ? "disabled" : ""}>&#8594;</button>
      </div>`;
  }

  const countLine = q
    ? `<p class="bitacora-count-line">${total} resultado${total !== 1 ? "s" : ""} para “${escHtml(bitacoraQuery)}”</p>`
    : "";

  wrap.innerHTML = countLine + cardsHtml + paginationHtml;
}

// Cuenta las bitácoras visibles según el filtro activo (para la paginación)
function filteredBitacorasCount() {
  const q = norm(bitacoraQuery);
  if (!q) return allBitacoras.length;
  return allBitacoras.filter(b =>
    norm(b.patient   || "").includes(q) ||
    norm(b.diagnosis || "").includes(q) ||
    norm(b.procedure || "").includes(q) ||
    (b.attendants || []).some(a => norm(a).includes(q))
  ).length;
}

window.setBitacorasPage = function(page) {
  const totalPages = Math.ceil(filteredBitacorasCount() / BITS_PER_PAGE);
  bitacorasPage = Math.max(0, Math.min(page, totalPages - 1));
  renderBitacoraList();
};

window.filterBitacoras = function() {
  bitacoraQuery = document.getElementById("bitacoraSearch").value;
  bitacorasPage = 0;
  const clr = document.getElementById("bitacoraSearchClear");
  if (clr) clr.style.display = bitacoraQuery ? "block" : "none";
  renderBitacoraList();
};

window.clearBitacoraSearch = function() {
  bitacoraQuery = "";
  const inp = document.getElementById("bitacoraSearch");
  if (inp) inp.value = "";
  const clr = document.getElementById("bitacoraSearchClear");
  if (clr) clr.style.display = "none";
  bitacorasPage = 0;
  renderBitacoraList();
};

// ── Edición de bitácoras ──────────────────────────────────────────────
// Selección en memoria del modal de edición (mismo patrón que el formulario)
let editSelectedAttendants = new Set();

window.openEditBitacora = function(id) {
  const b = allBitacoras.find(x => x.id === id);
  if (!b) return;
  editingBitacoraId = id;
  editSelectedAttendants = new Set(b.attendants || []);
  editSelectedPotions = new Set(b.potionsUsed || []);
  document.getElementById("editBitPatient").value  = b.patient   || "";
  document.getElementById("editBitDiag").value     = b.diagnosis || "";
  document.getElementById("editBitProc").value     = b.procedure || "";
  document.getElementById("editBitErr").style.display    = "none";
  document.getElementById("editAttendantSearch").value   = "";
  document.getElementById("editAttendantsList").innerHTML = buildEditAttendantsList();
  document.getElementById("editSpellInserter").innerHTML  = buildSpellInserter("editBitProc");
  renderEditSelectedPotions();
  document.getElementById("editBitacoraModal").classList.add("show");
};

function buildEditAttendantsList(filterQ = "") {
  const names = Object.keys(allStudents).sort();
  const item = (n, checked, missing = false) =>
    `<label class="attendant-item${checked ? " attendant-item-sel" : ""}${missing ? " attendant-item-missing" : ""}${n === loggedInStudent ? " attendant-item-me" : ""}">
      <input type="checkbox" class="edit-att-chk" value="${escHtml(n)}" ${checked ? "checked" : ""}
             onchange="toggleEditAttendant(this.value, this.checked)"/>
      ${escHtml(n)}${missing ? ' <span class="att-missing">⚠️ usuario no existe</span>' : ''}${n === loggedInStudent ? ' <span class="att-you">• tú</span>' : ""}
    </label>`;
  // Asistentes seleccionados que NO existen en la BD (aparecen siempre al principio)
  const missingAttendants = [...editSelectedAttendants].filter(n => !allStudents[n]).sort();
  // Asistentes que existen en la BD
  const checkedNames = names.filter(n => editSelectedAttendants.has(n));
  const others = names.filter(n =>
    !editSelectedAttendants.has(n) && (!filterQ || norm(n).includes(norm(filterQ)))
  );

  const missingHtml = missingAttendants.map(n => item(n, true, true)).join("");
  const existingHtml = checkedNames.map(n => item(n, true)).join("") +
                       others.map(n => item(n, false)).join("");

  if (!missingAttendants.length && !checkedNames.length && !others.length)
    return '<p style="color:#4a4540;font-size:.8rem;padding:.4rem">No hay medimagos en la base de datos.</p>';

  return missingHtml + existingHtml;
}

window.toggleEditAttendant = function(name, checked) {
  if (checked) editSelectedAttendants.add(name);
  else         editSelectedAttendants.delete(name);
  document.getElementById("editAttendantsList").innerHTML =
    buildEditAttendantsList(document.getElementById("editAttendantSearch").value);
};

window.filterEditAttendants = function() {
  document.getElementById("editAttendantsList").innerHTML =
    buildEditAttendantsList(document.getElementById("editAttendantSearch").value);
};

window.cancelEditBitacora = function() {
  editingBitacoraId = null;
  document.getElementById("editBitacoraModal").classList.remove("show");
};

let bitacoraEditSaving = false;
window.saveEditBitacora = async function() {
  if (bitacoraEditSaving) return;
  bitacoraEditSaving = true;
  const saveBtn = document.getElementById("saveEditBitBtn");
  if (saveBtn) saveBtn.disabled = true;
  try {
    await doSaveEditBitacora();
  } finally {
    bitacoraEditSaving = false;
    if (saveBtn) saveBtn.disabled = false;
  }
};
async function doSaveEditBitacora() {
  const errEl = document.getElementById("editBitErr");
  errEl.style.display = "none";
  // Guard: el modal pudo perder su estado (p.ej. tras cancelar)
  if (!editingBitacoraId) { errEl.textContent = "No hay ninguna bitácora en edición."; errEl.style.display = "block"; return; }
  const patient   = document.getElementById("editBitPatient").value.trim();
  const diagnosis = document.getElementById("editBitDiag").value.trim();
  const procedure = document.getElementById("editBitProc").value.trim();
  // Filtra asistentes que ya no existen en la base de datos (estudiantes eliminados)
  const attendants = [...editSelectedAttendants].filter(n => allStudents[n]);
  let potionsUsed = [...editSelectedPotions];

  if (!patient)            { errEl.textContent = "El nombre del paciente es obligatorio."; errEl.style.display = "block"; return; }
  if (!diagnosis)          { errEl.textContent = "El diagnóstico es obligatorio.";          errEl.style.display = "block"; return; }
  if (!procedure)          { errEl.textContent = "El procedimiento es obligatorio.";         errEl.style.display = "block"; return; }
  if (!attendants.length)  { errEl.textContent = "Selecciona al menos un medimago.";         errEl.style.display = "block"; return; }
  if (attendants.length < editSelectedAttendants.size) {
    errEl.textContent = `⚠️ ${editSelectedAttendants.size - attendants.length} asistente(s) no existen. Se guardarán solo los que existen.`;
    errEl.style.display = "block";
    await new Promise(r => setTimeout(r, 1500));
  }
  if (patient.length > 80 || diagnosis.length > 200 || procedure.length > 5000) {
    errEl.textContent = "Texto demasiado largo (paciente ≤80, diagnóstico ≤200, procedimiento ≤5000 caracteres).";
    errEl.style.display = "block"; return;
  }
  // Descartar pociones que no existen en la tabla `potions` (evita FK 23503)
  {
    const { valid, dropped } = await filterExistingPotions(potionsUsed);
    potionsUsed = valid;
    if (dropped) {
      errEl.textContent = `⚠️ ${dropped} poción(es) no están en el inventario y se omitirán. Pide a un admin que las añada.`;
      errEl.style.display = "block";
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  try {
    const now = new Date().toISOString();
    const idx = allBitacoras.findIndex(x => x.id === editingBitacoraId);
    const existingHistory = allBitacoras[idx]?.editHistory || [];
    // Basado en el máximo número existente (no en length) para evitar colisiones
    // si hubiera huecos en el historial (p.ej. una entrada borrada)
    const newEditNumber = existingHistory.reduce((m, e) => Math.max(m, e.editNumber || 0), 0) + 1;
    // Capturar las pociones anteriores ANTES de mutar el registro en memoria
    const oldPotions = [...(allBitacoras[idx]?.potionsUsed || [])];

    // Actualizar bitácora en Supabase
    const { error: bitError } = await supabase
      .from("bitacoras")
      .update({ patient, diagnosis, procedure })
      .eq("id", editingBitacoraId);
    if (bitError) throw bitError;

    // Eliminar y recrear attendants (comprobar el delete evita filas duplicadas
    // que inflarían el conteo por medimago si la inserción tiene éxito tras un delete fallido)
    const { error: delAttErr } = await supabase.from("bitacora_attendants").delete().eq("bitacora_id", editingBitacoraId);
    if (delAttErr) throw delAttErr;
    if (attendants.length > 0) {
      const attendantRecords = attendants.map(name => ({
        bitacora_id: editingBitacoraId,
        attendant_name: name,
        student_id: null
      }));
      const { error: attErr } = await supabase
        .from("bitacora_attendants")
        .insert(attendantRecords);
      if (attErr) throw attErr;
    }

    // Eliminar y recrear pociones
    const { error: delPotErr } = await supabase.from("bitacora_potions").delete().eq("bitacora_id", editingBitacoraId);
    if (delPotErr) throw delPotErr;
    if (potionsUsed.length > 0) {
      const potionRecords = potionsUsed.map(pid => ({
        bitacora_id: editingBitacoraId,
        potion_id: pid,
        qty: 1
      }));
      const { error: potErr } = await supabase
        .from("bitacora_potions")
        .insert(potionRecords);
      if (potErr) throw potErr;
    }

    // Crear entrada en historial de ediciones
    const { error: histErr } = await supabase
      .from("bitacora_edit_history")
      .insert({
        bitacora_id: editingBitacoraId,
        editor: loggedInStudent || "Sistema",
        edited_at: now,
        edit_number: newEditNumber
      });
    if (histErr) throw histErr;

    // Actualizar registro en memoria (incluye el nuevo historial de ediciones)
    if (idx >= 0) Object.assign(allBitacoras[idx], {
      patient, diagnosis, procedure, attendants, potionsUsed,
      editHistory: [
        ...existingHistory,
        { editor: loggedInStudent || "Sistema", editedAt: now, editNumber: newEditNumber }
      ]
    });

    // Ajustar inventario si hay cambios en pociones (oldPotions capturado antes de mutar)
    const oldSet = new Set(oldPotions);
    const newSet = new Set(potionsUsed);

    // Devolver al inventario las pociones que se quitaron
    for (const potionId of oldSet) {
      if (!newSet.has(potionId) && allInventory[potionId] !== undefined) {
        allInventory[potionId]++;
      }
    }
    // Restar las pociones nuevas que se agregaron
    for (const potionId of newSet) {
      if (!oldSet.has(potionId)) {
        if (allInventory[potionId]) {
          allInventory[potionId] = Math.max(0, allInventory[potionId] - 1);
        }
      }
    }

    // Guardar cambios del inventario
    if (oldSet.size || newSet.size) {
      try {
        const changedPotions = new Set([...oldSet, ...newSet]);
        for (const potionId of changedPotions) {
          await supabase
            .from("potions")
            .update({ qty: allInventory[potionId] || 0 })
            .eq("id", potionId);
        }
      } catch (invErr) {
        console.error("Error actualizando inventario:", invErr);
      }
    }

    cancelEditBitacora();
    toast("Bitácora actualizada", "success");
    updatePatientDatalist();
    renderBitacoraList();
    // Refrescar la vista de Personas si la edición se lanzó desde ahí
    if (currentScreen === "scPersonas") {
      renderPersonasList();
      if (selectedPersona) renderPersonaBitacoras();
    }
  } catch (err) {
    toast(`Error al guardar: ${err?.code || err?.message || "desconocido"}`, "error");
  }
}

// =====================================================================
//  PERSONAS EN BITÁCORAS
// =====================================================================
let personasPage          = 0;
let personaFilter         = "";
let selectedPersona       = null;
let personaBitsPage       = 0;
const PERSONAS_PER_PAGE   = 5;
const PERSONA_BITS_PER_PAGE = 3;
let personasFrom          = "search";

function buildPersonasList() {
  const map = {};
  allBitacoras.forEach(b => {
    if (b.patient) {
      if (!map[b.patient]) map[b.patient] = { asPatient: 0, asMedimago: 0 };
      map[b.patient].asPatient++;
    }
    (b.attendants || []).forEach(a => {
      if (!map[a]) map[a] = { asPatient: 0, asMedimago: 0 };
      map[a].asMedimago++;
    });
  });
  return Object.entries(map)
    .map(([name, counts]) => ({ name, ...counts, total: counts.asPatient + counts.asMedimago }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

window.showPersonas = async function(from = "search") {
  if (!isAdmin && !loggedInStudent) { goSearch(); return; }
  personasFrom   = from;
  personasPage   = 0;
  selectedPersona = null;
  show("scPersonas");
  if (!bitacorasLoaded) {
    document.getElementById("personasListWrap").innerHTML =
      '<div class="loading"><span class="spinner"></span>Cargando personas…</div>';
    try {
      await loadBitacoras();
      bitacorasLoaded = true;
    } catch {
      document.getElementById("personasListWrap").innerHTML =
        '<p class="notice" style="color:var(--red)">No se pudieron cargar las bitácoras.</p>';
      return;
    }
  }
  document.getElementById("personasSearch").value = "";
  personaFilter = "";
  renderPersonasList();
  document.getElementById("personaBitacorasWrap").style.display = "none";
};

window.filterPersonas = function() {
  personaFilter = document.getElementById("personasSearch").value;
  personasPage  = 0;
  renderPersonasList();
};

window.setPersonasPage = function(page) {
  const filtered   = buildPersonasList().filter(p => !personaFilter || norm(p.name).includes(norm(personaFilter)));
  const totalPages = Math.ceil(filtered.length / PERSONAS_PER_PAGE);
  personasPage     = Math.max(0, Math.min(page, totalPages - 1));
  renderPersonasList();
};

function renderPersonasList() {
  const all      = buildPersonasList();
  const filtered = personaFilter ? all.filter(p => norm(p.name).includes(norm(personaFilter))) : all;
  const wrap     = document.getElementById("personasListWrap");

  if (!filtered.length) {
    wrap.innerHTML = '<p class="empty-state">No se encontraron personas.</p>';
    return;
  }

  const total      = filtered.length;
  const totalPages = Math.ceil(total / PERSONAS_PER_PAGE);
  personasPage     = Math.max(0, Math.min(personasPage, totalPages - 1));
  const start      = personasPage * PERSONAS_PER_PAGE;
  const page       = filtered.slice(start, start + PERSONAS_PER_PAGE);

  const isRegistered = n => !!allStudents[n];

  const rows = page.map(p => `
    <div class="persona-row" onclick="selectPersona('${safeAttr(p.name)}')" role="button" tabindex="0">
      <div class="persona-info">
        <span class="persona-name">${escHtml(p.name)}</span>
        ${isRegistered(p.name) ? `<span class="persona-badge medimago">⚕ Medimago</span>` : ""}
      </div>
      <div class="persona-counts">
        ${p.asPatient  ? `<span class="persona-count as-patient" title="Veces como paciente">🤕 ${p.asPatient}</span>` : ""}
        ${p.asMedimago ? `<span class="persona-count as-medimago" title="Veces como medimago">⚕ ${p.asMedimago}</span>` : ""}
      </div>
      <span class="persona-arrow">›</span>
    </div>`).join("");

  let paginationHtml = "";
  if (totalPages > 1) {
    const pageBtns = Array.from({ length: totalPages }, (_, i) =>
      `<button class="page-btn${i === personasPage ? " active" : ""}" onclick="setPersonasPage(${i})">${i + 1}</button>`
    ).join("");
    paginationHtml = `<div class="pagination">
      <button class="page-btn" onclick="setPersonasPage(${personasPage - 1})" ${personasPage === 0 ? "disabled" : ""}>&#8592;</button>
      ${pageBtns}
      <button class="page-btn" onclick="setPersonasPage(${personasPage + 1})" ${personasPage >= totalPages - 1 ? "disabled" : ""}>&#8594;</button>
    </div>`;
  }

  wrap.innerHTML = `<p class="personas-count">${total} persona${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}</p>` + rows + paginationHtml;
}

window.selectPersona = function(name) {
  selectedPersona = name;
  personaBitsPage = 0;
  renderPersonaBitacoras();
  const wrapEl = document.getElementById("personaBitacorasWrap");
  wrapEl.style.display = "block";
  wrapEl.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.setPersonaBitsPage = function(page) {
  const bits       = getPersonaBitacoras(selectedPersona);
  const totalPages = Math.ceil(bits.length / PERSONA_BITS_PER_PAGE);
  personaBitsPage  = Math.max(0, Math.min(page, totalPages - 1));
  renderPersonaBitacoras();
};

function getPersonaBitacoras(name) {
  return allBitacoras.filter(b =>
    b.patient === name || (b.attendants || []).includes(name)
  );
}

function renderPersonaBitacoras() {
  const bits       = getPersonaBitacoras(selectedPersona);
  const titleEl    = document.getElementById("personaBitTitle");
  const contentEl  = document.getElementById("personaBitContent");

  titleEl.textContent = `Bitácoras de ${selectedPersona}`;

  if (!bits.length) {
    contentEl.innerHTML = '<p class="empty-state">Sin bitácoras registradas.</p>';
    return;
  }

  const totalPages = Math.ceil(bits.length / PERSONA_BITS_PER_PAGE);
  personaBitsPage  = Math.max(0, Math.min(personaBitsPage, totalPages - 1));
  const start      = personaBitsPage * PERSONA_BITS_PER_PAGE;
  const page       = bits.slice(start, start + PERSONA_BITS_PER_PAGE);

  const cardsHtml = page.map(b => {
    const asPatient   = b.patient === selectedPersona;
    const asMedimago  = (b.attendants || []).includes(selectedPersona);
    const roleLabel   = asPatient && asMedimago ? "Paciente y Medimago" : asPatient ? "Paciente" : "Medimago";
    const roleClass   = asPatient ? "role-patient" : "role-medimago";
    const canEdit     = isAdmin || (loggedInStudent && (b.attendants || []).includes(loggedInStudent));
    return `
    <div class="bitacora-card">
      <div class="bitacora-top">
        <div>
          <div class="bitacora-patient">${escHtml(b.patient)}</div>
          <div class="bitacora-date">${formatDate(b.createdAt)}</div>
        </div>
        <div style="display:flex;gap:.4rem;flex-shrink:0;flex-wrap:wrap;align-items:flex-start">
          <span class="persona-role-badge ${roleClass}">${roleLabel}</span>
          ${canEdit ? `<button class="btn sm" onclick="openEditBitacora('${b.id}')">Editar</button>` : ""}
          ${isAdmin ? `<button class="btn sm danger" onclick="deleteBitacora('${b.id}')">Eliminar</button>` : ""}
        </div>
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Diagnóstico</span>
        <span class="bitacora-value">${escHtml(b.diagnosis)}</span>
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Procedimiento</span>
        <span class="bitacora-value bitacora-proc">${escHtml(b.procedure)}</span>
      </div>
      <div class="bitacora-field">
        <span class="bitacora-label">Atendido por</span>
        <div class="bitacora-attendants">${(b.attendants || []).map(a =>
          `<span class="att-badge">${escHtml(a)}</span>`).join("")}</div>
      </div>
      ${editHistoryField(b)}
    </div>`;
  }).join("");

  let paginationHtml = "";
  if (totalPages > 1) {
    const pageBtns = Array.from({ length: totalPages }, (_, i) =>
      `<button class="page-btn${i === personaBitsPage ? " active" : ""}" onclick="setPersonaBitsPage(${i})">${i + 1}</button>`
    ).join("");
    paginationHtml = `<div class="pagination">
      <button class="page-btn" onclick="setPersonaBitsPage(${personaBitsPage - 1})" ${personaBitsPage === 0 ? "disabled" : ""}>&#8592;</button>
      ${pageBtns}
      <button class="page-btn" onclick="setPersonaBitsPage(${personaBitsPage + 1})" ${personaBitsPage >= totalPages - 1 ? "disabled" : ""}>&#8594;</button>
    </div>`;
  }

  contentEl.innerHTML = `<p class="personas-count">${bits.length} bitácora${bits.length !== 1 ? "s" : ""}</p>` + cardsHtml + paginationHtml;
}

window.backFromPersonas = function() {
  if (personasFrom === "admin") show("scAdmin");
  else if (loggedInStudent) show("scProfile");
  else goSearch();
};

// =====================================================================
//  ADMIN — CONFIGURACIÓN / CAMBIAR CONTRASEÑA
// =====================================================================
window.updatePwdStrength = function() {
  const pwd  = document.getElementById("pwdNew").value;
  const fill = document.getElementById("pwdStrengthFill");
  let pct = 0, color = "var(--red)";
  if (pwd.length >= 6)  { pct = 25; }
  if (pwd.length >= 8)  { pct = 45; color = "var(--gold)"; }
  if (pwd.length >= 12) { pct = 65; }
  if (pwd.length >= 8  && /[0-9]/.test(pwd))          pct += 15;
  if (pwd.length >= 8  && /[^a-zA-Z0-9]/.test(pwd))   pct += 15;
  if (pwd.length >= 8  && /[A-Z]/.test(pwd))           pct += 5;
  if (pct >= 75) color = "var(--green)";
  fill.style.width      = Math.min(pct, 100) + "%";
  fill.style.background = color;
};

window.changePassword = async function() {
  const current  = document.getElementById("pwdCurrent").value;
  const newPwd   = document.getElementById("pwdNew").value;
  const confirm  = document.getElementById("pwdConfirm").value;
  const errEl    = document.getElementById("pwdErr");
  const okEl     = document.getElementById("pwdOk");
  const btn      = document.querySelector("#tabConfig .btn.success");
  errEl.style.display = "none"; okEl.style.display = "none";

  const currentHash = await sha256(current);
  const activeHash  = isSuperAdmin ? superAdminHash : adminPwdHash;
  if (currentHash !== activeHash) {
    errEl.textContent = "La contraseña actual es incorrecta.";
    errEl.style.display = "block"; return;
  }
  if (newPwd.length < 8) {
    errEl.textContent = "La nueva contraseña debe tener al menos 8 caracteres.";
    errEl.style.display = "block"; return;
  }
  if (newPwd !== confirm) {
    errEl.textContent = "Las contraseñas no coinciden.";
    errEl.style.display = "block"; return;
  }

  btn.disabled = true; btn.textContent = "Guardando…";
  const newHash = await sha256(newPwd);
  const field   = isSuperAdmin ? "superPasswordHash" : "passwordHash";
  try {
    const { error } = await supabase
      .from("app_config")
      .upsert(
        {
          key: "admin_config",
          value: {
            ...(isSuperAdmin ? { superPasswordHash: newHash, passwordHash: adminPwdHash }
                            : { passwordHash: newHash, superPasswordHash: superAdminHash })
          }
        },
        { onConflict: "key" }
      );
    if (error) throw error;
  } catch (err) {
    errEl.textContent = `Error al guardar: ${err?.message || "desconocido"}`;
    errEl.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Guardar contraseña";
    return;
  }
  if (isSuperAdmin) superAdminHash = newHash; else adminPwdHash = newHash;

  document.getElementById("pwdCurrent").value = "";
  document.getElementById("pwdNew").value     = "";
  document.getElementById("pwdConfirm").value = "";
  document.getElementById("pwdStrengthFill").style.width = "0%";

  okEl.style.display = "block";
  setTimeout(() => okEl.style.display = "none", 2500);
  toast("Contraseña actualizada correctamente", "success");
  btn.disabled = false; btn.textContent = "Guardar nueva contraseña";
};

window.setSuperAdminPwd = async function() {
  const newPwd  = document.getElementById("pwdSuperNew").value;
  const confirm = document.getElementById("pwdSuperConfirm").value;
  const errEl   = document.getElementById("pwdSuperErr");
  const okEl    = document.getElementById("pwdSuperOk");
  errEl.style.display = "none"; okEl.style.display = "none";

  if (newPwd.length < 8) {
    errEl.textContent = "Mínimo 8 caracteres."; errEl.style.display = "block"; return;
  }
  if (newPwd !== confirm) {
    errEl.textContent = "Las contraseñas no coinciden."; errEl.style.display = "block"; return;
  }
  const hash = await sha256(newPwd);
  try {
    const { error } = await supabase
      .from("app_config")
      .upsert(
        {
          key: "admin_config",
          value: {
            superPasswordHash: hash,
            passwordHash: adminPwdHash
          }
        },
        { onConflict: "key" }
      );
    if (error) throw error;
  } catch (err) {
    errEl.textContent = `Error al guardar: ${err?.message || "desconocido"}`;
    errEl.style.display = "block";
    return;
  }
  superAdminHash = hash;
  document.getElementById("pwdSuperNew").value     = "";
  document.getElementById("pwdSuperConfirm").value = "";
  okEl.style.display = "block";
  setTimeout(() => okEl.style.display = "none", 2500);
  toast("Contraseña de superadmin guardada", "success");
};

// =====================================================================
//  SEGURIDAD — monitoreo de accesos y bloqueo por IP
// =====================================================================
async function initSecurity() {
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 4000);
    const res  = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(tid);
    const { ip } = await res.json();
    // Nunca almacenamos la IP real — solo su hash irreversible
    const ipHash = await hashIP(ip);
    visitorIP = ipHash; // guardamos el hash, no la IP

    const { data: blocked, error: blockedErr } = await supabase
      .from("blocked_ips")
      .select("*")
      .eq("ip_hash", ipHash)
      .maybeSingle();
    if (blockedErr) {
      console.warn("No se pudo comprobar blocked_ips:", blockedErr);
    }
    if (blocked) { show("scBlocked"); return; }

    // Registrar visita: solo hash + timestamp + navegador resumido (fire & forget)
    supabase
      .from("access_logs")
      .insert({
        ip_hash: ipHash,
        ts: new Date().toISOString(),
        ua: uaSummary(navigator.userAgent)
      })
      .catch(() => {});
  } catch { /* fallo silencioso */ }
}

async function renderSecurityTab() {
  const wrap = document.getElementById("securityWrap");
  if (!wrap) return;
  wrap.innerHTML = '<div class="loading"><span class="spinner"></span>Cargando seguridad…</div>';
  try {
    const [{ data: logs }, { data: blockedList }] = await Promise.all([
      supabase.from("access_logs").select("*"),
      supabase.from("blocked_ips").select("*")
    ]);

    const sortedLogs = (logs || []).sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
    const recent = sortedLogs.slice(0, 100);

    const blocked = {};
    (blockedList || []).forEach(b => { blocked[b.ip_hash] = b; });

    // Los hashes de IP son hex seguros — no necesitan escapeHtml
    // — IPs bloqueadas —
    const blockedRows = Object.values(blocked);
    const blockedHtml = !blockedRows.length
      ? '<p class="empty-state">No hay IPs bloqueadas.</p>'
      : `<table class="student-table">
          <thead><tr><th>Hash IP</th><th>Bloqueada</th><th></th></tr></thead>
          <tbody>${blockedRows.map(b => `<tr class="blocked-row">
            <td class="ip-cell">${b.ip_hash.substring(0,16)}…${b.ip_hash === visitorIP ? ' <span class="ip-you-badge">tú</span>' : ""}</td>
            <td>${formatDate(b.blocked_at)}</td>
            <td><button class="btn sm success" onclick="unblockIP('${b.ip_hash}')">Desbloquear</button></td>
          </tr>`).join("")}</tbody>
        </table>`;

    // — Registro de accesos —
    const logsHtml = !recent.length
      ? '<p class="empty-state">Sin registros de acceso aún.</p>'
      : `<table class="student-table">
          <thead><tr><th>Hash IP</th><th>Fecha</th><th>Navegador</th><th></th></tr></thead>
          <tbody>${recent.map(l => {
            const isBlk = !!blocked[l.ip_hash];
            return `<tr class="${isBlk ? "blocked-row" : ""}">
              <td class="ip-cell">${escHtml(l.ip_hash).substring(0,16)}…
                ${l.ip_hash === visitorIP ? '<span class="ip-you-badge">tú</span>' : ""}
                ${isBlk ? '<span class="ip-blocked-badge">bloqueada</span>' : ""}
              </td>
              <td>${l.ts ? formatDate(l.ts) : "—"}</td>
              <td class="ua-cell">${escHtml(l.ua || "—")}</td>
              <td>${!isBlk
                ? `<button class="btn sm danger" onclick="blockIP('${l.ip_hash}')">Bloquear</button>`
                : `<button class="btn sm success" onclick="unblockIP('${l.ip_hash}')">Desbloquear</button>`}
              </td>
            </tr>`;
          }).join("")}</tbody>
        </table>`;

    wrap.innerHTML = `
      <div class="sec-section">
        <p class="sec-title">🚫 IPs bloqueadas <span class="sec-count">${blockedRows.length}</span></p>
        ${blockedHtml}
      </div>
      <div class="sec-section" style="margin-top:1.6rem">
        <p class="sec-title">📋 Últimos ${recent.length} accesos
          <button class="btn sm ghost" style="margin-left:.6rem" onclick="clearOldLogs()">Limpiar logs</button>
        </p>
        ${logsHtml}
      </div>`;
  } catch (e) {
    wrap.innerHTML = `<p class="notice" style="color:var(--red)">Error al cargar datos: ${e.message}</p>`;
  }
}

window.blockIP = async function(ipHash) {
  const ok = await showModal(
    "Bloquear IP",
    `¿Bloquear acceso desde ${ipHash}? No podrá acceder a la web.`,
    "Bloquear", "danger"
  );
  if (!ok) return;
  try {
    const { error } = await supabase
      .from("blocked_ips")
      .insert({
        ip_hash: ipHash,
        blocked_at: new Date().toISOString()
      });
    if (error) throw error;
    toast(`IP ${ipHash} bloqueada`, "error");
    renderSecurityTab();
  } catch (err) {
    toast(`Error al bloquear: ${err?.message || "desconocido"}`, "error");
  }
};

window.unblockIP = async function(ipHash) {
  try {
    const { error } = await supabase
      .from("blocked_ips")
      .delete()
      .eq("ip_hash", ipHash);
    if (error) throw error;
    toast(`IP ${ipHash} desbloqueada`, "success");
    renderSecurityTab();
  } catch (err) {
    toast(`Error al desbloquear: ${err?.message || "desconocido"}`, "error");
  }
};

window.clearOldLogs = async function() {
  const ok = await showModal(
    "Limpiar registros",
    "¿Eliminar todos los registros de acceso? Los bloqueos activos no se verán afectados.",
    "Limpiar", "danger"
  );
  if (!ok) return;
  try {
    const { error } = await supabase
      .from("access_logs")
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
    toast("Registros eliminados", "success");
    renderSecurityTab();
  } catch (err) {
    toast(`Error al limpiar: ${err?.message || "desconocido"}`, "error");
  }
};

// =====================================================================
//  EXPORTACIÓN CSV (admin)
// =====================================================================
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => {
    const s = String(c ?? "");
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\r\n");
  // BOM para que Excel detecte UTF-8 correctamente
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

window.exportStudentsCSV = function() {
  const names = Object.keys(allStudents);
  if (!names.length) { toast("No hay alumnos para exportar.", "error"); return; }
  const now = new Date();
  const ty = now.getFullYear(), tm = now.getMonth();
  const ly = tm === 0 ? ty - 1 : ty, lm = tm === 0 ? 11 : tm - 1;
  const all = allSpells();
  const rows = [["Nombre", "Rango", "% Total", "Graduado", "Bitácoras (mes actual)", "Bitácoras (mes pasado)"]];
  names.sort((a, b) => a.localeCompare(b, "es")).forEach(n => {
    const sp  = allStudents[n];
    const pct = Math.round(all.filter(s => sp[s]).length / all.length * 100);
    rows.push([
      n, getStudentRank(n), pct + "%", allGraduated[n] ? "Sí" : "No",
      bitacorasLoaded ? bitCntMonth(n, ty, tm) : "",
      bitacorasLoaded ? bitCntMonth(n, ly, lm) : ""
    ]);
  });
  downloadCSV(`alumnos_medimagia_${ty}-${String(tm + 1).padStart(2, "0")}.csv`, rows);
  toast(`✓ Exportados ${names.length} alumnos`, "success");
};

window.exportBitacorasCSV = async function() {
  if (!bitacorasLoaded) {
    try { await loadBitacoras(); bitacorasLoaded = true; }
    catch { toast("No se pudieron cargar las bitácoras.", "error"); return; }
  }
  if (!allBitacoras.length) { toast("No hay bitácoras para exportar.", "error"); return; }
  const rows = [["Fecha", "Paciente", "Diagnóstico", "Procedimiento", "Atendido por"]];
  allBitacoras.forEach(b => rows.push([
    b.createdAt ? new Date(b.createdAt).toLocaleString("es-ES") : "",
    b.patient || "", b.diagnosis || "", b.procedure || "",
    (b.attendants || []).join("; ")
  ]));
  downloadCSV("bitacoras_medimagia.csv", rows);
  toast(`✓ Exportadas ${allBitacoras.length} bitácoras`, "success");
};

// =====================================================================
//  MEJORAS DE UI — toggle de contraseña · volver arriba
// =====================================================================
// Añade un botón mostrar/ocultar a cada campo de contraseña
function enhancePasswordFields() {
  document.querySelectorAll('input[type="password"]').forEach(inp => {
    if (inp.parentElement && inp.parentElement.classList.contains("pwd-wrap")) return;
    const wrap = document.createElement("span");
    wrap.className = "pwd-wrap";
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);
    inp.classList.add("has-pwd-toggle");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pwd-toggle";
    btn.textContent = "👁";
    btn.setAttribute("aria-label", "Mostrar u ocultar contraseña");
    btn.addEventListener("click", () => {
      const showing = inp.type === "text";
      inp.type = showing ? "password" : "text";
      btn.textContent = showing ? "👁" : "🙈";
    });
    wrap.appendChild(btn);
  });
}

// Muestra el botón "volver arriba" al desplazarse
function initScrollTop() {
  const btn = document.getElementById("scrollTopBtn");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 380);
  }, { passive: true });
}

// Aviso del navegador si se intenta cerrar con cambios sin guardar en el perfil
window.addEventListener("beforeunload", e => {
  if (currentScreen === "scProfile" && isProfileDirty()) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// =====================================================================
//  AUTO-LOGIN — restaura la sesión guardada (si sigue siendo válida)
// =====================================================================
function tryAutoLogin() {
  const d = loadSession();
  if (!d) return;
  // No restaurar si el visitante está bloqueado
  const blk = document.getElementById("scBlocked");
  if (currentScreen === "scBlocked" || (blk && blk.style.display === "block")) return;

  if (d.kind === "student" && d.name && allStudents[d.name]) {
    window.loggedInStudent = d.name;
    updateAppHeader();
    loadAllStudents().then(() => {
      openProfile(d.name);
    }).catch(() => {
      openProfile(d.name);
    });
    return;
  }

  if (d.kind === "admin") {
    window.isAdmin = true;
    window.isSuperAdmin = d.role === "superadmin";
    applyAdminRole();
    updateAppHeader();
    show("scAdmin");
    loadAllStudents().then(() => {
      renderList(); renderAscensos(); renderGraduados();
      resetSessionTimer();
      if (!bitacorasLoaded) {
        loadBitacoras().then(() => { bitacorasLoaded = true; renderList(); }).catch(() => {});
      }
    });
  }
}

// =====================================================================
//  INIT
// =====================================================================
const loadingEl  = document.getElementById("loadingIndicator");
const searchCard = document.querySelector("#scSearch .card");
loadingEl.style.display    = "block";
searchCard.style.opacity   = "0.4";

enhancePasswordFields();
initScrollTop();

initSecurity(); // corre en paralelo: detecta IP, verifica bloqueo y registra visita

loadRanksConfig()
  .then(() => Promise.all([loadAllStudents(), loadAdminConfig()]))
  .then(() => {
    loadingEl.style.display  = "none";
    searchCard.style.opacity = "1";
    renderRankSelector();
    tryAutoLogin();   // restaura la sesión guardada si "mantener sesión" estaba activo
  })
  .catch(err => {
    const code = err?.code || err?.message || String(err);
    console.error("Error durante inicialización:", err);
    loadingEl.innerHTML =
      `<span style="color:var(--red)">Error al cargar la aplicación.<br><small style="opacity:.7">${escHtml(code)}</small><br><small>Abre la consola (F12) para ver más detalles.</small></span>`;
  });

// =====================================================================
//  INVENTARIO DE POCIONES
// =====================================================================
async function loadInventory() {
  try {
    const { data: potions, error } = await supabase
      .from("potions")
      .select("id, qty");

    if (error) {
      console.error("Error cargando inventario:", error);
      allInventory = {};
      return;
    }

    allInventory = {};
    if (potions) {
      potions.forEach(p => {
        allInventory[p.id] = p.qty;
      });
    }
  } catch (err) {
    console.error("Error en loadInventory:", err);
    allInventory = {};
  }
}

let pendingInventoryChanges = {};

function renderInventory() {
  const q = (document.getElementById("invSearch") || {}).value.toLowerCase() || "";
  const wrap = document.getElementById("inventoryWrap");
  if (!wrap) return;

  const filtered = POTIONS_CATALOG.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    wrap.innerHTML = '<p class="empty-state">No hay pociones que coincidan con la búsqueda.</p>';
    return;
  }

  const rows = filtered.map(p => {
    const currentQty = allInventory[p.id] || 0;
    const pendingQty = pendingInventoryChanges[p.id] !== undefined ? pendingInventoryChanges[p.id] : currentQty;
    const changed = pendingQty !== currentQty;
    const quantityClass = pendingQty === 0 ? "inv-qty-empty" : pendingQty < 5 ? "inv-qty-low" : "";

    return `
    <tr class="inv-row${changed ? " inv-row-changed" : ""}">
      <td class="inv-cell-name">${escHtml(p.name)}</td>
      <td class="inv-cell-cat">${escHtml(p.category)}</td>
      <td class="inv-cell-qty">
        <input type="number" min="0" max="9999" value="${pendingQty}"
               onchange="updatePotionQty('${safeAttr(p.id)}', this.value)"
               class="inv-input ${quantityClass}"/>
      </td>
      <td class="inv-cell-status">${changed ? '<span class="inv-changed">● Cambio</span>' : '<span class="inv-unchanged">Sin cambios</span>'}</td>
    </tr>`;
  }).join("");

  const html = `
    <table class="inv-table">
      <thead>
        <tr>
          <th>Poción</th>
          <th>Categoría</th>
          <th>Cantidad</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;

  wrap.innerHTML = html;

  // Mostrar botones de guardar si hay cambios
  const hasChanges = Object.keys(pendingInventoryChanges).length > 0;
  const actionBtn = document.getElementById("inventoryActions");
  if (actionBtn) actionBtn.style.display = hasChanges ? "flex" : "none";
}

window.filterInventory = function() {
  renderInventory();
};

window.updatePotionQty = function(id, value) {
  const qty = parseInt(value) || 0;
  if (qty < 0) {
    toast("La cantidad no puede ser negativa", "error");
    renderInventory();
    return;
  }
  pendingInventoryChanges[id] = qty;
  renderInventory();
};

window.saveAllInventory = async function() {
  if (Object.keys(pendingInventoryChanges).length === 0) {
    toast("No hay cambios para guardar", "info");
    return;
  }

  Object.assign(allInventory, pendingInventoryChanges);

  try {
    // Actualizar cada poción en Supabase
    for (const [potionId, qty] of Object.entries(pendingInventoryChanges)) {
      const { error } = await supabase
        .from("potions")
        .update({ qty: Math.max(0, qty) })
        .eq("id", potionId);

      if (error) throw error;
    }

    toast("Inventario guardado correctamente", "success");

    // Limpiar cambios pendientes
    pendingInventoryChanges = {};
    document.getElementById("invOk").style.display = "block";
    setTimeout(() => document.getElementById("invOk").style.display = "none", 3000);

    renderInventory();
  } catch (err) {
    const errMsg = err?.message || "desconocido";
    document.getElementById("invErr").textContent = `Error: ${errMsg}`;
    document.getElementById("invErr").style.display = "block";
    toast(`Error al guardar: ${errMsg}`, "error");
  }
};

window.reloadInventoryView = function() {
  pendingInventoryChanges = {};
  renderInventory();
  toast("Cambios descartados", "info");
};

window.updatePotionDetails = function() {
  const id = document.getElementById("potionSelect").value;
  const potion = POTIONS_CATALOG.find(p => p.id === id);
  const detailsWrap = document.getElementById("potionDetailsWrap");
  if (potion) {
    document.getElementById("potionDescription").textContent = potion.desc;
    detailsWrap.style.display = "block";
  } else {
    detailsWrap.style.display = "none";
  }
};


window.editPotionQuantity = async function(id) {
  const potion = POTIONS_CATALOG.find(p => p.id === id);
  if (!potion) return;
  const currentQty = allInventory[id] || 0;
  const newQty = prompt(`${escHtml(potion.name)}\nCantidad actual: ${currentQty}\n\nNueva cantidad:`, currentQty);
  if (newQty === null) return;
  const parsedQty = parseInt(newQty);
  if (isNaN(parsedQty) || parsedQty < 0) {
    toast("Cantidad inválida", "error");
    return;
  }
  if (parsedQty === currentQty) return;

  allInventory[id] = parsedQty;
  try {
    const { error } = await supabase
      .from("potions")
      .update({ qty: parsedQty })
      .eq("id", id);
    if (error) throw error;
    toast(`${potion.name} actualizado a ${parsedQty} unidades`, "success");
    renderInventory();
  } catch (err) {
    toast(`Error: ${err?.message || "desconocido"}`, "error");
  }
};

window.deletePotionFromInventory = async function(id) {
  const potion = POTIONS_CATALOG.find(p => p.id === id);
  if (!potion) return;
  const ok = await showModal(
    "Eliminar del inventario",
    `¿Eliminar ${escHtml(potion.name)} del inventario?`,
    "Eliminar", "danger"
  );
  if (!ok) return;

  delete allInventory[id];
  try {
    const { error } = await supabase
      .from("potions")
      .update({ qty: 0 })
      .eq("id", id);
    if (error) throw error;
    toast(`${potion.name} eliminado del inventario`, "success");
    renderInventory();
  } catch (err) {
    toast(`Error: ${err?.message || "desconocido"}`, "error");
  }
};

// =====================================================================
//  POCIONES EN BITÁCORAS — Selección y deducción automática
// =====================================================================
let selectedPotions = new Set();           // para crear bitácora
let editSelectedPotions = new Set();       // para editar bitácora
let potionSelectorMode = "create";         // "create" o "edit"

window.showPotionSelectorModal = function() {
  selectedPotions = new Set();
  potionSelectorMode = "create";
  renderPotionSelectorList("");
  document.getElementById("potionSelectorSearch").value = "";
  document.getElementById("potionSelectorModal").classList.add("show");
};

window.closePotionSelectorModal = function() {
  document.getElementById("potionSelectorModal").classList.remove("show");
};

window.showEditPotionSelectorModal = function() {
  editSelectedPotions = new Set();
  potionSelectorMode = "edit";
  renderEditPotionSelectorList("");
  document.getElementById("editPotionSelectorSearch").value = "";
  document.getElementById("editPotionSelectorModal").classList.add("show");
};

window.closeEditPotionSelectorModal = function() {
  document.getElementById("editPotionSelectorModal").classList.remove("show");
};

function renderPotionSelectorList(filterQ = "") {
  const q = filterQ.toLowerCase();
  const filtered = POTIONS_CATALOG.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  const items = filtered.map(p => {
    const checked = selectedPotions.has(p.id) ? "checked" : "";
    return `
    <label class="potion-selector-item">
      <input type="checkbox" ${checked} onchange="togglePotion('${safeAttr(p.id)}', this.checked)"/>
      <div class="potion-selector-info">
        <div class="potion-selector-name">${escHtml(p.name)}</div>
        <div class="potion-selector-cat">${escHtml(p.category)}</div>
      </div>
    </label>`;
  }).join("");

  document.getElementById("potionSelectorList").innerHTML = items || '<p class="empty-state">Sin resultados</p>';
}

function renderEditPotionSelectorList(filterQ = "") {
  const q = filterQ.toLowerCase();
  const filtered = POTIONS_CATALOG.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  const items = filtered.map(p => {
    const checked = editSelectedPotions.has(p.id) ? "checked" : "";
    return `
    <label class="potion-selector-item">
      <input type="checkbox" ${checked} onchange="toggleEditPotion('${safeAttr(p.id)}', this.checked)"/>
      <div class="potion-selector-info">
        <div class="potion-selector-name">${escHtml(p.name)}</div>
        <div class="potion-selector-cat">${escHtml(p.category)}</div>
      </div>
    </label>`;
  }).join("");

  document.getElementById("editPotionSelectorList").innerHTML = items || '<p class="empty-state">Sin resultados</p>';
}

window.togglePotion = function(id, checked) {
  if (checked) selectedPotions.add(id);
  else         selectedPotions.delete(id);
  renderPotionSelectorList(document.getElementById("potionSelectorSearch").value);
};

window.toggleEditPotion = function(id, checked) {
  if (checked) editSelectedPotions.add(id);
  else         editSelectedPotions.delete(id);
  renderEditPotionSelectorList(document.getElementById("editPotionSelectorSearch").value);
};

window.filterPotionSelector = function() {
  renderPotionSelectorList(document.getElementById("potionSelectorSearch").value);
};

window.filterEditPotionSelector = function() {
  renderEditPotionSelectorList(document.getElementById("editPotionSelectorSearch").value);
};

window.confirmPotionSelection = function() {
  closePotionSelectorModal();
  renderSelectedPotions();
};

window.confirmEditPotionSelection = function() {
  closeEditPotionSelectorModal();
  renderEditSelectedPotions();
};

function renderSelectedPotions() {
  const wrap = document.getElementById("potionsSelected");
  if (!selectedPotions.size) {
    wrap.innerHTML = "";
    return;
  }
  const potions = Array.from(selectedPotions)
    .map(id => POTIONS_CATALOG.find(p => p.id === id))
    .filter(p => p);

  const tags = potions.map(p =>
    `<span class="potion-tag">
      🧪 ${escHtml(p.name)}
      <button type="button" onclick="removeSelectedPotion('${safeAttr(p.id)}')">✕</button>
    </span>`
  ).join("");

  wrap.innerHTML = tags;
}

function renderEditSelectedPotions() {
  const wrap = document.getElementById("editPotionsSelected");
  if (!editSelectedPotions.size) {
    wrap.innerHTML = "";
    return;
  }
  const potions = Array.from(editSelectedPotions)
    .map(id => POTIONS_CATALOG.find(p => p.id === id))
    .filter(p => p);

  const tags = potions.map(p =>
    `<span class="potion-tag">
      🧪 ${escHtml(p.name)}
      <button type="button" onclick="removeEditSelectedPotion('${safeAttr(p.id)}')">✕</button>
    </span>`
  ).join("");

  wrap.innerHTML = tags;
}

// =====================================================================
//  ASISTENCIA (Attendance Tracking)
// =====================================================================

let attendanceLoaded = false;

async function loadAttendance() {
  const { data: sessions, error: sessErr } = await supabase
    .from("attendance_sessions")
    .select("id, session_date, title, created_by")
    .order("session_date", { ascending: false });
  if (sessErr) { console.error("Error cargando asistencias:", sessErr); return; }

  const { data: records, error: recErr } = await supabase
    .from("attendance_records")
    .select("session_id, student_id, attended");
  if (recErr) { console.error("Error cargando registros:", recErr); return; }

  const recBySession = {};
  (records || []).forEach(r => {
    if (!recBySession[r.session_id]) recBySession[r.session_id] = [];
    recBySession[r.session_id].push(r);
  });

  allAttendance = (sessions || []).map(s => ({
    id: s.id,
    session_date: s.session_date,
    title: s.title || "Clase",
    created_by: s.created_by,
    records: recBySession[s.id] || []
  }));
  attendanceLoaded = true;
}

function idToName(studentId) {
  for (const [name, id] of Object.entries(studentIdMap)) {
    if (id === studentId) return name;
  }
  return null;
}

function renderAttendanceTab() {
  const dateInput = document.getElementById("attDate");
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  const names = Object.keys(allStudents).filter(n => !allGraduated[n]).sort((a, b) => a.localeCompare(b, "es"));
  const listEl = document.getElementById("attStudentList");
  listEl.innerHTML = `<div class="att-student-list">${names.map(n => {
    const rank = getStudentRank(n);
    // safeAttr escapa para JS dentro de onclick; en un atributo normal
    // metería una barra invertida y "Colin O'Sullivan" no se encontraría.
    const id = "att_" + domKey(n);
    return `<div class="att-student-row" onclick="this.querySelector('input').click()">
      <input type="checkbox" id="${id}" data-student="${escHtml(n)}" onclick="event.stopPropagation()"/>
      <label for="${id}" onclick="event.stopPropagation()">${escHtml(n)}</label>
      <span class="rank-badge ${rankClass('rk', rank)}">${rank}</span>
    </div>`;
  }).join("")}</div>`;

  if (!attendanceLoaded) {
    loadAttendance().then(() => renderAttendanceHistory()).catch(() => {});
  } else {
    renderAttendanceHistory();
  }
}

function renderAttendanceHistory() {
  const wrap = document.getElementById("attHistoryWrap");
  if (!allAttendance.length) {
    wrap.innerHTML = `<p style="color:var(--fg-sub);font-size:.88rem">No hay sesiones de asistencia registradas.</p>`;
    return;
  }

  const rows = allAttendance.slice(0, 50).map(s => {
    const present = s.records.filter(r => r.attended).length;
    const absent = s.records.filter(r => !r.attended).length;
    const dateStr = new Date(s.session_date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    return `<tr style="cursor:pointer" onclick="showAttendanceDetail('${s.id}')">
      <td>${dateStr}</td>
      <td>${escHtml(s.title)}</td>
      <td><span class="att-badge present">${present}</span></td>
      <td><span class="att-badge absent">${absent}</span></td>
    </tr>`;
  }).join("");

  wrap.innerHTML = `<table class="att-history-table">
    <thead><tr><th>Fecha</th><th>Descripción</th><th>Presentes</th><th>Ausentes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

window.showAttendanceDetail = function(sessionId) {
  const session = allAttendance.find(s => s.id === sessionId);
  if (!session) return;

  const presentNames = session.records.filter(r => r.attended).map(r => idToName(r.student_id)).filter(Boolean).sort();
  const absentNames = session.records.filter(r => !r.attended).map(r => idToName(r.student_id)).filter(Boolean).sort();
  const dateStr = new Date(session.session_date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const html = `<div class="att-detail-card">
    <div class="att-detail-header">
      <span class="att-detail-date">${dateStr}</span>
      <span class="att-detail-title">${escHtml(session.title)}</span>
    </div>
    <div style="margin-top:.6rem">
      <strong style="color:var(--green)">Presentes (${presentNames.length}):</strong>
      <div class="att-detail-names">${presentNames.length ? presentNames.map(n => escHtml(n)).join(", ") : "Ninguno"}</div>
    </div>
    <div style="margin-top:.5rem">
      <strong style="color:var(--red)">Ausentes (${absentNames.length}):</strong>
      <div class="att-detail-names">${absentNames.length ? absentNames.map(n => escHtml(n)).join(", ") : "Ninguno"}</div>
    </div>
  </div>`;

  const wrap = document.getElementById("attHistoryWrap");
  const existing = document.getElementById("attDetailPanel");
  if (existing) existing.remove();
  wrap.insertAdjacentHTML("beforebegin", `<div id="attDetailPanel" style="margin-bottom:1rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
      <strong>Detalle de sesión</strong>
      <div style="display:flex;gap:.4rem">
        <button class="btn ghost sm" onclick="editAttendanceSession('${escJsAttr(session.id)}')">✏️ Editar</button>
        <button class="btn ghost sm" onclick="document.getElementById('attDetailPanel').remove()">✕ Cerrar</button>
      </div>
    </div>
    ${html}
  </div>`);
};

function escJsAttr(id) { return String(id).replace(/'/g, "\\'"); }

window.editAttendanceSession = function(sessionId) {
  const session = allAttendance.find(s => s.id === sessionId);
  if (!session) return;

  const presentIds = new Set(session.records.filter(r => r.attended).map(r => r.student_id));
  const names = Object.keys(allStudents).filter(n => !allGraduated[n]).sort((a, b) => a.localeCompare(b, "es"));

  const rowsHtml = names.map(n => {
    const rank = getStudentRank(n);
    const sid = studentIdMap[n];
    const checked = sid && presentIds.has(sid) ? "checked" : "";
    return `<div class="att-student-row" onclick="this.querySelector('input').click()">
      <input type="checkbox" id="attEdit_${domKey(n)}" data-student="${escHtml(n)}" onclick="event.stopPropagation()" ${checked}/>
      <label for="attEdit_${domKey(n)}" onclick="event.stopPropagation()">${escHtml(n)}</label>
      <span class="rank-badge ${rankClass('rk', rank)}">${rank}</span>
    </div>`;
  }).join("");

  const html = `<div class="att-detail-card">
    <div class="att-detail-header">
      <span class="att-detail-date">${escHtml(session.title)}</span>
    </div>
    <div style="display:flex;gap:.5rem;margin:.6rem 0">
      <button class="btn ghost sm" onclick="attEditSelectAll(true)">Marcar todos</button>
      <button class="btn ghost sm" onclick="attEditSelectAll(false)">Desmarcar todos</button>
    </div>
    <div class="att-student-list" id="attEditList">${rowsHtml}</div>
    <div style="display:flex;gap:.5rem;margin-top:.8rem">
      <button class="btn success sm" onclick="saveAttendanceEdit('${escJsAttr(session.id)}')">💾 Guardar cambios</button>
      <button class="btn ghost sm" onclick="showAttendanceDetail('${escJsAttr(session.id)}')">Cancelar</button>
    </div>
    <p class="err" id="attEditErr" style="display:none;margin-top:.5rem"></p>
  </div>`;

  const wrap = document.getElementById("attHistoryWrap");
  const existing = document.getElementById("attDetailPanel");
  if (existing) existing.remove();
  wrap.insertAdjacentHTML("beforebegin", `<div id="attDetailPanel" style="margin-bottom:1rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
      <strong>Editar asistencia</strong>
      <button class="btn ghost sm" onclick="document.getElementById('attDetailPanel').remove()">✕ Cerrar</button>
    </div>
    ${html}
  </div>`);
};

window.attEditSelectAll = function(checked) {
  document.querySelectorAll("#attEditList input[type=checkbox]").forEach(cb => cb.checked = checked);
};

window.saveAttendanceEdit = async function(sessionId) {
  const session = allAttendance.find(s => s.id === sessionId);
  const errEl = document.getElementById("attEditErr");
  if (!session) return;
  errEl.style.display = "none";

  const checkboxes = document.querySelectorAll("#attEditList input[type=checkbox]");
  const records = [];
  checkboxes.forEach(cb => {
    const name = cb.getAttribute("data-student");
    const sid = studentIdMap[name];
    if (sid) records.push({ session_id: sessionId, student_id: sid, attended: cb.checked });
  });

  try {
    const { error: delErr } = await supabase
      .from("attendance_records")
      .delete()
      .eq("session_id", sessionId);
    if (delErr) throw delErr;

    if (records.length) {
      const { error: insErr } = await supabase
        .from("attendance_records")
        .insert(records);
      if (insErr) throw insErr;
    }

    session.records = records;
    renderAttendanceHistory();
    showAttendanceDetail(sessionId);
  } catch (err) {
    console.error("Error actualizando asistencia:", err);
    errEl.textContent = `Error al guardar: ${err?.message || "Comprueba tu conexión."}`;
    errEl.style.display = "block";
  }
};

window.attSelectAll = function(checked) {
  document.querySelectorAll("#attStudentList input[type=checkbox]").forEach(cb => cb.checked = checked);
};

window.saveAttendance = async function() {
  const dateVal = document.getElementById("attDate").value;
  const titleVal = document.getElementById("attTitle").value.trim() || "Clase";
  const okEl = document.getElementById("attOk");
  const errEl = document.getElementById("attErr");
  okEl.style.display = "none";
  errEl.style.display = "none";

  if (!dateVal) {
    errEl.textContent = "Selecciona una fecha.";
    errEl.style.display = "block";
    return;
  }

  const checkboxes = document.querySelectorAll("#attStudentList input[type=checkbox]");
  const records = [];
  checkboxes.forEach(cb => {
    const name = cb.getAttribute("data-student");
    const sid = studentIdMap[name];
    if (sid) records.push({ student_id: sid, attended: cb.checked });
  });

  if (!records.length) {
    errEl.textContent = "No hay alumnos para registrar.";
    errEl.style.display = "block";
    return;
  }

  try {
    const { data: session, error: sessErr } = await supabase
      .from("attendance_sessions")
      .insert({ session_date: dateVal, title: titleVal, created_by: "admin" })
      .select("id")
      .single();
    if (sessErr) throw sessErr;

    const inserts = records.map(r => ({ session_id: session.id, ...r }));
    const { error: recErr } = await supabase
      .from("attendance_records")
      .insert(inserts);
    if (recErr) throw recErr;

    allAttendance.unshift({
      id: session.id,
      session_date: dateVal,
      title: titleVal,
      created_by: "admin",
      records: records
    });

    okEl.style.display = "block";
    setTimeout(() => okEl.style.display = "none", 3000);

    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById("attTitle").value = "";

    renderAttendanceHistory();
  } catch (err) {
    console.error("Error guardando asistencia:", err);
    errEl.textContent = `Error al guardar: ${err?.message || "Comprueba tu conexión."}`;
    errEl.style.display = "block";
  }
};

// Per-student attendance in profile
function renderProfileAttendance(name) {
  const el = document.getElementById("pAttendance");
  if (!el) return;
  const sid = studentIdMap[name];
  if (!sid || !attendanceLoaded) {
    if (!attendanceLoaded) {
      el.innerHTML = "";
      loadAttendance().then(() => renderProfileAttendance(name)).catch(() => {});
    }
    return;
  }

  const sessions = allAttendance.filter(s => s.records.some(r => r.student_id === sid));
  if (!sessions.length) {
    el.innerHTML = `<div class="att-profile-section">
      <p class="card-title">📋 Asistencia</p>
      <p style="color:var(--fg-sub);font-size:.88rem">Sin registros de asistencia.</p>
    </div>`;
    return;
  }

  const attended = sessions.filter(s => s.records.find(r => r.student_id === sid)?.attended);
  const missed = sessions.filter(s => !s.records.find(r => r.student_id === sid)?.attended);
  const pct = Math.round(attended.length / sessions.length * 100);

  const rows = sessions.slice(0, 20).map(s => {
    const rec = s.records.find(r => r.student_id === sid);
    const was = rec?.attended;
    const dateStr = new Date(s.session_date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    const others = s.records.filter(r => r.student_id !== sid);
    const othersPresent = others.filter(r => r.attended).map(r => idToName(r.student_id)).filter(Boolean);
    const othersAbsent = others.filter(r => !r.attended).map(r => idToName(r.student_id)).filter(Boolean);
    return `<div class="att-detail-card">
      <div class="att-detail-header">
        <span class="att-detail-date">${dateStr} — ${escHtml(s.title)}</span>
        <span class="att-badge ${was ? "present" : "absent"}">${was ? "Presente" : "Ausente"}</span>
      </div>
      <div class="att-detail-names">
        ${othersPresent.length ? `<span style="color:var(--green)">Presentes:</span> ${othersPresent.map(n => escHtml(n)).join(", ")}` : ""}
        ${othersAbsent.length ? `${othersPresent.length ? "<br>" : ""}<span style="color:var(--red)">Ausentes:</span> ${othersAbsent.map(n => escHtml(n)).join(", ")}` : ""}
      </div>
    </div>`;
  }).join("");

  el.innerHTML = `<div class="att-profile-section">
    <p class="card-title">📋 Asistencia</p>
    <div class="att-summary">
      <div class="att-summary-stat"><strong>${attended.length}</strong><span>Presentes</span></div>
      <div class="att-summary-stat"><strong>${missed.length}</strong><span>Ausentes</span></div>
      <div class="att-summary-stat"><strong>${pct}%</strong><span>Asistencia</span></div>
    </div>
    ${rows}
  </div>`;
}

window.removeSelectedPotion = function(id) {
  selectedPotions.delete(id);
  renderSelectedPotions();
};

window.removeEditSelectedPotion = function(id) {
  editSelectedPotions.delete(id);
  renderEditSelectedPotions();
};
                                                                          