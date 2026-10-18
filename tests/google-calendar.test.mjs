import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root = resolve('.');
async function harness() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
  sqlite.exec(readFileSync('migrations/0002_google_calendar.sql', 'utf8'));
  const db = { prepare(sql) {
    let params = [];
    const statement = { bind(...args) { params = args; return statement; }, async first() { return sqlite.prepare(sql).get(...params) || null; }, async all() { return { results: sqlite.prepare(sql).all(...params) }; }, async run() { return { meta: sqlite.prepare(sql).run(...params) }; } };
    return statement;
  }, async batch(statements) { return Promise.all(statements.map(s => s.run())); } };
  const env = { DB: db, GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', GOOGLE_TOKEN_KEY: 'ab'.repeat(32), GOOGLE_REDIRECT_URI: 'https://ecbc.test/api/google/callback' };
  const cookies = new Map();
  const jar = { get: key => cookies.has(key) ? {value:cookies.get(key)} : undefined, set: (key, value) => cookies.set(key, value) };
  const context = vm.createContext({ crypto, TextEncoder, TextDecoder, URL, URLSearchParams, Request, Response, Headers, AbortSignal, Date, console, btoa, atob, fetch: (...args) => context.mockFetch(...args) });
  const cache = new Map();
  async function module(name) {
    if (cache.has(name)) return cache.get(name);
    let mod;
    if (name === 'cloudflare:workers') mod = new vm.SyntheticModule(['env'], function() { this.setExport('env', env); }, {context});
    else if (name === 'next/headers') mod = new vm.SyntheticModule(['cookies'], function() { this.setExport('cookies', async () => jar); }, {context});
    else {
      const code = ts.transpileModule(readFileSync(name, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
      mod = new vm.SourceTextModule(code, {context, identifier: name});
    }
    cache.set(name, mod);
    await mod.link((specifier, parent) => module(specifier === 'cloudflare:workers' || specifier === 'next/headers' ? specifier : resolve(specifier.startsWith('@/') ? root : dirname(parent.identifier), specifier.replace(/^@\//, '')) + '.ts'));
    return mod;
  }
  async function load(path) { const mod = await module(resolve(path)); if (mod.status !== 'evaluated') await mod.evaluate(); return mod.namespace; }
  const google = await load('lib/google-calendar.ts');
  context.mockFetch = async () => { throw new Error('Unexpected network access'); };
  async function add(subject='one', calendar='club') {
    await db.prepare('INSERT INTO google_connections(subject,email,refresh_token,calendar_id) VALUES(?,?,?,?)').bind(subject, subject+'@test.com', await google.seal('refresh-token'), calendar).run();
  }
  const event = (id='a', title='Practice') => ({ id, summary: title, start: {dateTime:'2026-10-18T19:00:00-04:00'}, end:{dateTime:'2026-10-18T21:00:00-04:00'} });
  return { db, sqlite, env, cookies, context, load, google, add, event };
}

test('Eastern dates, DST, all-day exclusive ends, multi-day events and private/cancelled filtering', async () => {
  const h = await harness(); const {googleEventRows: rows} = await h.load('lib/google-events.ts');
  const range = ['2026-01-01','2027-01-01'];
  const mapped = rows('club', h.event(), ...range);
  assert.equal(mapped[0].start,'19:00');
  const dst = rows('club',{id:'dst',start:{dateTime:'2026-03-08T06:30:00Z'},end:{dateTime:'2026-03-08T07:30:00Z'}},...range);
  assert.equal(dst[0].start,'01:30'); assert.equal(dst[0].end,'03:30');
  const all = rows('club',{id:'all',start:{date:'2026-10-18'},end:{date:'2026-10-20'}},...range);
  assert.equal(all.length,2); assert.equal(all[1].date,'2026-10-19'); assert.equal(all[0].allDay,true);
  assert.equal(rows('club',{...h.event(),visibility:'private'},...range).length,0);
  assert.equal(rows('club',{...h.event(),status:'cancelled'},...range).length,0);
  const overnight = rows('club',{id:'night',start:{dateTime:'2026-10-18T23:00:00-04:00'},end:{dateTime:'2026-10-19T01:00:00-04:00'}},...range);
  assert.equal(overnight.length,2); assert.equal(overnight[0].end,'24:00'); assert.equal(overnight[1].start,'00:00');
});
test('paginated snapshot add/update/delete, deduplication, failure retention and disconnection', async () => {
  const h = await harness(); await h.add();
  let items = [h.event('a'), h.event('b')]; let fail = false; let forbidden = false;
  h.context.mockFetch = async url => {
    if (String(url).includes('/token')) return Response.json({access_token:'access'});
    if (forbidden) return new Response('',{status:403});
    if (fail && String(url).includes('pageToken')) return new Response('',{status:503});
    return String(url).includes('pageToken') ? Response.json({items:items.slice(1)}) : Response.json({items:items.slice(0,1),nextPageToken:'page2'});
  };
  await h.google.syncConnection('one'); assert.equal((await h.google.publicGoogleEvents(false)).length,2);
  items = [h.event('a','Changed')]; await h.google.syncConnection('one');
  let rows = await h.google.publicGoogleEvents(false); assert.equal(rows.length,1); assert.equal(rows[0].title,'Changed'); assert.equal(rows[0].googleUrl,undefined);
  fail = true; items = []; await h.google.syncConnection('one'); assert.equal((await h.google.publicGoogleEvents(false)).length,1);
  fail = false; await h.add('two'); items = [h.event('a','Changed')]; await h.google.syncConnection('two'); assert.equal((await h.google.publicGoogleEvents(false)).length,1);
  await h.db.prepare('DELETE FROM google_connections WHERE subject=?').bind('two').run();
  forbidden = true; await h.google.syncConnection('one'); assert.equal((await h.google.publicGoogleEvents(false)).length,0);
});
test('old in-flight sync cannot overwrite a newly selected calendar', async () => {
  const h = await harness(); await h.add();
  h.context.mockFetch = async url => {
    if (String(url).includes('/token')) return Response.json({access_token:'access'});
    await h.db.prepare("UPDATE google_connections SET revision=revision+1,calendar_id='new' WHERE subject='one'").run();
    return Response.json({items:[h.event()]});
  };
  await h.google.syncConnection('one'); assert.equal((await h.google.publicGoogleEvents(false)).length,0);
});
test('OAuth requires owner login, checks origin, binds state to browser and rejects replay', async () => {
  const h = await harness();
  const route = await h.load('app/api/google/connect/route.ts');
  const request = origin => new Request('https://ecbc.test/api/google/connect',{method:'POST',headers:{Origin:origin}});
  assert.equal((await route.POST(request('https://ecbc.test'))).status,403);
  const token = 'cd'.repeat(32); const session = await h.google.hash(token);
  await h.db.prepare('INSERT INTO owner_sessions VALUES(?,?)').bind(session,Date.now()+60000).run(); h.cookies.set('__Host-ecbc-owner',token);
  assert.equal((await route.POST(request('https://evil.test'))).status,403);
  const result = await route.POST(request('https://ecbc.test')); assert.equal(result.status,303);
  const state = new URL(result.headers.get('location')).searchParams.get('state');
  const browser = h.cookies.get(h.google.GOOGLE_COOKIE);
  const callback = await h.load('app/api/google/callback/route.ts');
  const callbackRequest = new Request('https://ecbc.test/api/google/callback?code=code&state='+state);
  h.cookies.delete('__Host-ecbc-owner'); // Strict cookie is absent on external redirect.
  h.cookies.set(h.google.GOOGLE_COOKIE,'ef'.repeat(32));
  assert.match((await callback.GET(callbackRequest)).headers.get('location'),/failed/);
  h.cookies.set(h.google.GOOGLE_COOKIE,browser);
  h.context.mockFetch = async url => String(url).includes('/token') ? Response.json({access_token:'access',refresh_token:'refresh',scope:h.google.scopes.join(' ')}) : Response.json({sub:'user-one',email:'owner@test.com',email_verified:true});
  assert.match((await callback.GET(callbackRequest)).headers.get('location'),/connected/);
  const connection = await h.google.connectionFor(session); assert.equal(connection.subject,'user-one'); assert.notEqual(connection.refresh_token,'refresh');
  h.cookies.set(h.google.GOOGLE_COOKIE,browser);
  assert.match((await callback.GET(callbackRequest)).headers.get('location'),/failed/);
});
