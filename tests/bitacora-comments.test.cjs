const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Reuse the existing whole-app fixture without registering its test cases.
const fixture = fs.readFileSync(require.resolve('./frontend-access.test.cjs'), 'utf8').split("test('students cannot")[0];
const harness = new Function('require', `${fixture}\nreturn harness;`)(require);
const user = { id: '60600000-0000-0000-0000-000000000001' };
const id = '60600000-0000-0000-0000-000000000010';
const section = scope => `bitComments-${scope}-${id}`;
const input = scope => `bitCommentText-${scope}-${id}`;
const event = () => ({ preventDefault() {} });
function signedIn(options = {}) {
  const h = harness({ user, ...options });
  h.run(`loggedInStudent = 'Student'; allBitacoras = [{id:'${id}',patient:'Patient',attendants:['Student']}];`);
  return h;
}

test('anonymous visitors cannot read or submit comments', async () => {
  const h = harness();
  assert.equal(h.run(`bitacoraCommentsHtml('${id}', 'list')`), '');
  await h.context.loadBitacoraComments(id, 'list');
  await h.context.submitBitacoraComment(event(), id, 'list');
  assert.equal(h.calls.some(c => c[1] === 'bitacora_comments'), false);
});

test('both card views show independent comment controls without changing record contents', () => {
  const h = signedIn();
  const card = h.run('bitacoraCardHtml(allBitacoras[0])');
  assert.match(card, /Patient/);
  assert.match(card, /Diagnóstico/);
  assert.match(card, /Ver comentarios/);
  assert.match(card, new RegExp(section('list')));
  h.run("selectedPersona = 'Student'; renderPersonaBitacoras();");
  assert.match(h.node('personaBitContent').innerHTML, new RegExp(section('persona')));
});

test('authenticated reads escape author and body while retaining plain text newlines', async () => {
  const h = signedIn({ db: () => ({ data: [{ author_name: '<Admin>', body: '<script>x</script>\nNext', created_at: '2026-11-03T10:00:00Z' }] }) });
  await h.context.loadBitacoraComments(id, 'list');
  const html = h.node(section('list')).innerHTML;
  assert.match(html, /&lt;Admin&gt;/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;\nNext/);
  assert.doesNotMatch(html, /<script>/);
  assert.ok(h.calls.some(c => c[0] === 'eq' && c[2] === 'bitacora_id' && c[3] === id));
});

test('posting binds only the record and text, preserves the list and clears the successful draft', async () => {
  const h = signedIn();
  h.node(input('list')).value = '  New comment  ';
  h.node('bitacoraCards').innerHTML = 'Existing filtered cards';
  await h.context.submitBitacoraComment(event(), id, 'list');
  const insert = h.calls.find(c => c[0] === 'insert' && c[1] === 'bitacora_comments');
  assert.equal(JSON.stringify(insert?.[2]), JSON.stringify({ bitacora_id: id, body: 'New comment' }));
  assert.equal(h.node(input('list')).value, '');
  assert.equal(h.node('bitacoraCards').innerHTML, 'Existing filtered cards');
});

test('empty and oversized comments never write to the database', async () => {
  const h = signedIn();
  for (const body of [' \n\t ', 'x'.repeat(2001)]) {
    h.node(input('list')).value = body;
    await h.context.submitBitacoraComment(event(), id, 'list');
  }
  assert.equal(h.calls.some(c => c[0] === 'insert'), false);
});

test('expired authentication and rejected inserts preserve drafts and show an error', async () => {
  for (const options of [{ user: null }, { db: () => ({ error: { message: 'denied' } }) }]) {
    const h = signedIn(options);
    h.node(input('list')).value = 'Keep this draft';
    await h.context.submitBitacoraComment(event(), id, 'list');
    assert.equal(h.node(input('list')).value, 'Keep this draft');
    assert.ok(h.node(`bitCommentStatus-list-${id}`).textContent);
    if (!options.user && !options.db) assert.equal(h.calls.some(c => c[0] === 'insert'), false);
  }
});

test('logout invalidates an in-flight comment read', async () => {
  let resolve;
  const pending = new Promise(r => { resolve = r; });
  const h = signedIn({ db: () => pending });
  const load = h.context.loadBitacoraComments(id, 'list');
  await new Promise(r => setImmediate(r));
  h.run('clearSensitiveData(); isAdmin=false; loggedInStudent=null;');
  h.node(section('list')).innerHTML = '';
  resolve({ data: [{ author_name: 'Private', body: 'Old session', created_at: '2026-11-03' }] });
  await load;
  assert.equal(h.node(section('list')).innerHTML, '');
});

test('duplicate submits are ignored and logout prevents a late save from clearing a new draft', async () => {
  let resolve;
  const pending = new Promise(r => { resolve = r; });
  const h = signedIn({ db: () => pending });
  h.node(input('list')).value = 'First draft';
  const save = h.context.submitBitacoraComment(event(), id, 'list');
  await new Promise(r => setImmediate(r));
  await h.context.submitBitacoraComment(event(), id, 'list');
  assert.equal(h.calls.filter(c => c[0] === 'insert').length, 1);
  h.run('clearSensitiveData(); loggedInStudent=null;');
  h.node(input('list')).value = 'New session draft';
  resolve({ error: null });
  await save;
  assert.equal(h.node(input('list')).value, 'New session draft');
  assert.doesNotMatch(h.node(`bitCommentStatus-list-${id}`).textContent, /publicado/);
});

test('comments beyond the default database row limit are loaded in stable pages', async () => {
  let calls = 0;
  const row = { author_name: 'Reader', body: 'Comment', created_at: '2026-11-03' };
  const h = signedIn({ db: () => ({ data: ++calls === 1 ? Array.from({ length: 1000 }, () => row) : [{ ...row, body: 'Last page' }] }) });
  await h.context.loadBitacoraComments(id, 'list');
  assert.match(h.node(section('list')).innerHTML, /Last page/);
  assert.ok(h.calls.some(c => c[0] === 'range' && c[2] === 1000 && c[3] === 1999));
});

test('the newest read wins when earlier responses arrive late', async () => {
  let resolve;
  let calls = 0;
  const pending = new Promise(r => { resolve = r; });
  const h = signedIn({ db: () => ++calls === 1 ? pending : { data: [{ author_name: 'Reader', body: 'New', created_at: '2026-11-03' }] } });
  const old = h.context.loadBitacoraComments(id, 'list');
  await new Promise(r => setImmediate(r));
  await h.context.loadBitacoraComments(id, 'list');
  resolve({ data: [{ author_name: 'Reader', body: 'Old', created_at: '2026-11-02' }] });
  await old;
  assert.match(h.node(section('list')).innerHTML, />New</);
  assert.doesNotMatch(h.node(section('list')).innerHTML, />Old</);
});

test('comment migration binds server authors and inherits parent visibility', () => {
  const sql = fs.readFileSync(require.resolve('../supabase/migrations/006_bitacora_comments.sql'), 'utf8');
  assert.match(sql, /GRANT INSERT\s*\(bitacora_id, body\)/i);
  assert.match(sql, /NEW\.author_id\s*:=\s*auth\.uid\(\)/i);
  assert.match(sql, /NEW\.created_at\s*:=\s*pg_catalog\.now\(\)/i);
  assert.match(sql, /EXISTS\s*\(SELECT 1 FROM public\.bitacoras/i);
  assert.match(sql, /FOR INSERT TO authenticated/i);
  assert.match(sql, /REVOKE ALL ON TABLE public\.bitacora_comments FROM PUBLIC, anon, authenticated/i);
});
