const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function harness(options = {}) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '', value: '', style: {},
      classList: { add() {}, remove() {}, toggle() {} }, remove() { this.innerHTML = ''; },
      appendChild() {}, setAttribute() {}, getAttribute() {}, addEventListener() {} });
    return nodes.get(id);
  };
  const calls = [];
  const timers = [];
  let authListener;
  const storage = new Map();
  const db = options.db || (() => ({ data: [], error: null }));
  const supabase = {
    auth: { getUser: options.getUser || (async () => ({ data: { user: options.user || null } })),
      signOut: async () => { calls.push(['signOut']); return {}; },
      onAuthStateChange: callback => { authListener = callback; return { data: { subscription: {} } }; } },
    rpc: async (name, args) => { calls.push(['rpc', name, args]); return options.rpc ? options.rpc(name, args) : { data: name === 'current_user_role' ? options.role || 'student' : { blocked: false } }; },
    from(table) {
      calls.push(['from', table]);
      const query = { then(resolve, reject) { return Promise.resolve(db(table)).then(resolve, reject); } };
      for (const method of ['select', 'order', 'eq', 'insert', 'delete', 'gte', 'single', 'maybeSingle', 'limit', 'range']) {
        query[method] = (...args) => { calls.push([method, table, ...args]); return query; };
      }
      return query;
    }
  };
  const context = { console, crypto: webcrypto, TextEncoder, Date, Set, Map, URL,
    atob: value => Buffer.from(value, 'base64').toString(),
    createClient: () => supabase, navigator: { userAgent: 'TestBrowser' },
    location: { protocol: 'https:', hostname: 'localhost' },
    fetch: async () => ({ json: async () => ({ ip: '203.0.113.10' }) }),
    AbortController, setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {},
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    document: { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener() {}, createElement: node },
    addEventListener() {}, scrollTo() {}, alert() {} };
  context.window = context;
  vm.createContext(context);
  let source = fs.readFileSync(require.resolve('../app.js'), 'utf8').replace(/^import .*;\r?\n/, '');
  const initStart = source.indexOf('const loadingEl  =');
  const initEnd = source.indexOf('async function loadInventory()', initStart);
  source = source.slice(0, initStart) + source.slice(initEnd);
  vm.runInContext(source, context);
  vm.runInContext('showModal = async () => true; toast = () => {};', context);
  return { context, calls, node, storage, timers, authEvent: (event, session) => authListener(event, session), run: code => vm.runInContext(code, context) };
}

test('students cannot load attendance or open private tabs or action callbacks', async () => {
  const h = harness();
  await h.run('loadAttendance()');
  await h.run('renderSecurityTab()');
  h.context.showTab('tabAttendance');
  h.context.showTab('tabSecurity');
  h.context.showAttendanceDetail('any');
  h.context.editAttendanceSession('any');
  await h.context.saveAttendance();
  await h.context.blockIP('a'.repeat(64));
  await h.context.unblockIP('a'.repeat(64));
  await h.context.clearOldLogs();
  assert.equal(h.calls.filter(c => c[0] === 'from').length, 0);
  assert.equal(h.run('currentScreen'), 'scSearch');
});

test('student profile attendance is empty without requesting records', () => {
  const h = harness();
  h.node('pAttendance').innerHTML = 'old secret';
  h.run('renderProfileAttendance("Alice")');
  assert.equal(h.node('pAttendance').innerHTML, '');
  assert.equal(h.calls.length, 0);
});

test('administrators retain attendance loading, history and profile summary', async () => {
  const h = harness({ db: table => ({ data: table === 'attendance_sessions'
    ? [{ id: 'session', session_date: '2026-11-03', title: 'Lesson' }]
    : [{ session_id: 'session', student_id: 'student', attended: true }] }) });
  h.context.isAdmin = true;
  await h.run('loadAttendance()');
  h.run('studentIdMap.Alice = "student"; renderAttendanceHistory(); renderProfileAttendance("Alice")');
  assert.match(h.node('attHistoryWrap').innerHTML, /Lesson/);
  assert.match(h.node('pAttendance').innerHTML, /100%/);
});

test('logout signs out and clears sensitive caches and DOM', async () => {
  const h = harness();
  h.context.isAdmin = true;
  h.run('attendanceLoaded = true; allAttendance = [{ id: "secret" }]');
  for (const id of ['pAttendance', 'securityWrap', 'attHistoryWrap', 'attStudentList', 'attDetailPanel']) h.node(id).innerHTML = 'secret';
  await h.context.cerrarSesion();
  assert.ok(h.calls.some(c => c[0] === 'signOut'));
  assert.equal(h.run('allAttendance.length'), 0);
  for (const id of ['pAttendance', 'securityWrap', 'attHistoryWrap', 'attStudentList', 'attDetailPanel']) assert.equal(h.node(id).innerHTML, '');
});

test('late attendance results cannot repopulate the cache after logout', async () => {
  let release;
  const h = harness({ db: table => table === 'attendance_sessions' ? new Promise(resolve => { release = resolve; }) : ({ data: [] }) });
  h.context.isAdmin = true;
  const pending = h.run('loadAttendance()');
  await Promise.resolve();
  await h.context.cerrarSesion();
  release({ data: [{ id: 'secret' }] });
  await pending;
  assert.equal(h.run('allAttendance.length'), 0);
});

test('forged remembered administrator never opens administrator UI', async () => {
  const h = harness({ user: { id: 'student' }, role: 'student' });
  h.storage.set('mm_session', JSON.stringify({ kind: 'admin', role: 'superadmin', ts: Date.now() }));
  await h.run('tryAutoLogin()');
  assert.equal(h.context.isAdmin, false);
  assert.equal(h.run('currentScreen'), 'scSearch');
});

test('security groups shared IP users and anonymous-only IPs for ordinary administrators', async () => {
  const shared = 'a'.repeat(64), anonymous = 'b'.repeat(64);
  const logs = [
    { ip_hash: shared, user_id: 'u1', profile: { username: 'alice', display_name: 'Alice' } },
    { ip_hash: shared, user_id: 'u2', profile: { username: 'bob', display_name: 'Bob' } },
    { ip_hash: shared, user_id: null }, { ip_hash: anonymous, user_id: null }
  ];
  const h = harness({ db: table => ({ data: table === 'access_logs' ? logs : [] }) });
  h.context.isAdmin = true;
  h.run('applyAdminRole()');
  assert.notEqual(h.node('tabSecurityBtn').style.display, 'none');
  await h.run('renderSecurityTab()');
  const html = h.node('securityWrap').innerHTML;
  assert.match(html, /Alice/); assert.match(html, /Bob/);
  assert.match(html, /IPs sin usuario registrado/);
  const anonymousSection = html.split('IPs sin usuario registrado')[1];
  assert.match(anonymousSection, /bbbbbbbbbbbbbbbb/);
  assert.doesNotMatch(anonymousSection, /aaaaaaaaaaaaaaaa/);
});

test('startup access recording only sends hash and browser to server RPC', async () => {
  const h = harness();
  await h.run('initSecurity()');
  const record = h.calls.find(c => c[0] === 'rpc' && c[1] === 'record_access');
  assert.ok(record);
  assert.deepEqual(Object.keys(record[2]).sort(), ['p_ip_hash', 'p_ua']);
  assert.match(record[2].p_ip_hash, /^[a-f0-9]{64}$/);
  assert.equal(h.calls.filter(c => c[0] === 'from').length, 0);
});

test('real sign-in schedules server-side association outside the auth callback', async () => {
  const h = harness({ user: { id: 'user' }, role: 'student' });
  h.run('watchAccessAuth()');
  h.authEvent('SIGNED_IN');
  assert.equal(h.calls.length, 0);
  await h.timers[0]();
  const record = h.calls.find(c => c[1] === 'record_access');
  assert.ok(record);
  assert.equal('user_id' in record[2], false);
});

test('late security results and external sign-out cannot retain private content', async () => {
  let release;
  const h = harness({ db: () => new Promise(resolve => { release = resolve; }) });
  h.context.isAdmin = true;
  h.run('watchAccessAuth()');
  const pending = h.run('renderSecurityTab()');
  await Promise.resolve();
  h.authEvent('SIGNED_OUT');
  release({ data: [{ ip_hash: 'a'.repeat(64), user_id: 'secret' }] });
  await pending;
  assert.equal(h.node('securityWrap').innerHTML, '');
  assert.equal(h.context.isAdmin, false);
});

test('ordinary administrator restoration uses server role, not remembered superadmin role', async () => {
  const h = harness({ user: { id: 'admin' }, role: 'admin' });
  h.storage.set('mm_session', JSON.stringify({ kind: 'admin', role: 'superadmin', ts: Date.now() }));
  h.run('loadAllStudents = async () => {}; renderList = () => {}; renderAscensos = () => {}; renderGraduados = () => {}; bitacorasLoaded = true;');
  await h.run('tryAutoLogin()');
  assert.equal(h.context.isAdmin, true);
  assert.equal(h.context.isSuperAdmin, false);
  assert.equal(h.run('currentScreen'), 'scAdmin');
  assert.notEqual(h.node('tabSecurityBtn').style.display, 'none');
});

test('student restoration still opens their own profile without attendance reads', async () => {
  const h = harness({ user: { id: 'student' }, db: () => ({ data: { username: 'alice', display_name: 'Alice' } }) });
  h.storage.set('mm_session', JSON.stringify({ kind: 'student', name: 'Forged name', userId: 'student', ts: Date.now() }));
  h.run('usernameIndex.alice = "Alice"; allStudents.Alice = {}; openProfile = name => { window.openedProfile = name; };');
  await h.run('tryAutoLogin()');
  assert.equal(h.context.openedProfile, 'Alice');
  assert.equal(h.context.isAdmin, false);
  assert.deepEqual(h.calls.filter(c => c[0] === 'from').map(c => c[1]), ['profiles']);
});

test('administrator attendance creation still persists the session and student records', async () => {
  const h = harness({ db: table => ({ data: table === 'attendance_sessions' ? { id: 'session' } : [] }) });
  h.context.isAdmin = true;
  h.node('attDate').value = '2026-11-03'; h.node('attTitle').value = 'Lesson';
  h.run('studentIdMap.Alice = "student"; renderAttendanceHistory = () => {};');
  const checkbox = { checked: true, getAttribute: () => 'Alice' };
  h.context.document.querySelectorAll = selector => selector.includes('checkbox') ? [checkbox] : [];
  await h.context.saveAttendance();
  assert.equal(h.calls.filter(c => c[0] === 'insert').length, 2);
  assert.equal(h.run('allAttendance[0].id'), 'session');
  assert.equal(h.run('allAttendance[0].records[0].attended'), true);
  assert.equal(checkbox.checked, false);
});

test('switching authenticated accounts in another tab removes administrator data', async () => {
  const h = harness({ user: { id: 'admin' }, role: 'admin' });
  await h.run('verifiedSession()');
  h.context.isAdmin = true;
  h.node('securityWrap').innerHTML = 'secret';
  h.run('watchAccessAuth()');
  h.authEvent('SIGNED_IN', { user: { id: 'student' } });
  assert.equal(h.context.isAdmin, false);
  assert.equal(h.node('securityWrap').innerHTML, '');
});

test('a delayed administrator role cannot restore after an account switch during verification', async () => {
  let releaseRole, requestedRole;
  const roleRequested = new Promise(resolve => { requestedRole = resolve; });
  const h = harness({ user: { id: 'admin' }, rpc: () => new Promise(resolve => {
    releaseRole = resolve; requestedRole();
  }) });
  h.storage.set('mm_session', JSON.stringify({ kind: 'admin', role: 'admin', ts: Date.now() }));
  h.run('watchAccessAuth(); loadAllStudents = async () => {}; renderList = () => {}; renderAscensos = () => {}; renderGraduados = () => {}; bitacorasLoaded = true;');
  const pending = h.run('tryAutoLogin()');
  await roleRequested;
  assert.equal(h.context.isAdmin, false);
  h.authEvent('SIGNED_IN', { user: { id: 'student' } });
  releaseRole({ data: 'admin' });
  await pending;
  assert.equal(h.context.isAdmin, false);
  assert.equal(h.run('currentScreen'), 'scSearch');
  assert.equal(h.node('securityWrap').innerHTML, '');
});

test('a same-account sign-in does not invalidate legitimate pending administrator verification', async () => {
  let releaseRole, requestedRole;
  const roleRequested = new Promise(resolve => { requestedRole = resolve; });
  const h = harness({ user: { id: 'admin' }, rpc: () => new Promise(resolve => {
    releaseRole = resolve; requestedRole();
  }) });
  h.storage.set('mm_session', JSON.stringify({ kind: 'admin', role: 'admin', ts: Date.now() }));
  h.run('watchAccessAuth(); loadAllStudents = async () => {}; renderList = () => {}; renderAscensos = () => {}; renderGraduados = () => {}; bitacorasLoaded = true;');
  const pending = h.run('tryAutoLogin()');
  await roleRequested;
  h.authEvent('SIGNED_IN', { user: { id: 'admin' } });
  releaseRole({ data: 'admin' });
  await pending;
  assert.equal(h.context.isAdmin, true);
  assert.equal(h.run('currentScreen'), 'scAdmin');
});

test('a delayed user lookup cannot bind an old account to a new sign-in', async () => {
  let releaseUser;
  const h = harness({ role: 'admin', getUser: () => new Promise(resolve => { releaseUser = resolve; }) });
  h.storage.set('mm_session', JSON.stringify({ kind: 'admin', role: 'admin', ts: Date.now() }));
  h.run('watchAccessAuth()');
  const pending = h.run('tryAutoLogin()');
  h.authEvent('SIGNED_IN', { user: { id: 'student' } });
  releaseUser({ data: { user: { id: 'admin' } } });
  await pending;
  assert.equal(h.context.isAdmin, false);
  assert.equal(h.run('currentScreen'), 'scSearch');
  assert.equal(h.calls.filter(call => call[1] === 'current_user_role').length, 0);
});

test('a delayed student profile lookup cannot restore after an account switch', async () => {
  let releaseProfile, requestedProfile;
  const profileRequested = new Promise(resolve => { requestedProfile = resolve; });
  const h = harness({ user: { id: 'student' }, db: () => new Promise(resolve => {
    releaseProfile = resolve; requestedProfile();
  }) });
  h.storage.set('mm_session', JSON.stringify({ kind: 'student', userId: 'student', ts: Date.now() }));
  h.run('watchAccessAuth(); usernameIndex.alice = "Alice"; allStudents.Alice = {}; openProfile = name => { window.openedProfile = name; };');
  const pending = h.run('tryAutoLogin()');
  await profileRequested;
  h.authEvent('SIGNED_IN', { user: { id: 'other-student' } });
  releaseProfile({ data: { username: 'alice', display_name: 'Alice' } });
  await pending;
  assert.equal(h.context.loggedInStudent, null);
  assert.equal(h.context.openedProfile, undefined);
  assert.equal(h.run('currentScreen'), 'scSearch');
});
