// Paste this entire file into a NEW Cloudflare Worker's Edit code screen.
// Bind a NEW D1 database as DB. Configure the variables in SETUP.md.
export default {
  async fetch(request, env) {
    const app = createApp(env);
    const origin = request.headers.get('Origin');
    let allowed;
    try { allowed = new URL(env.SITE_URL).origin; } catch { return Response.json({error:'Set SITE_URL in Worker Settings.'},{status:503}); }
    const headers = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Vary':'Origin'};
    if (origin === allowed) Object.assign(headers, {'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'});
    if (origin && origin !== allowed) return new Response('Origin not allowed',{status:403,headers});
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    try {
      if (request.method === 'POST' && origin !== allowed) throw new Failure('Open the ECBC website to perform this action.',403);
      await app.init();
      const response = await app.route(request);
      const result = new Response(response.body,response);
      for (const [key,value] of Object.entries(headers)) result.headers.set(key,value);
      return result;
    } catch (error) {
      return Response.json({error:error instanceof Failure ? error.message : 'Service unavailable. Check Worker settings and try again.'},{status:error instanceof Failure ? error.status : 503,headers});
    }
  },
  async scheduled(_controller,env,ctx) {
    const app=createApp(env);
    ctx.waitUntil((async()=>{await app.init();await app.syncGoogleCalendars();})());
  }
};
class Failure extends Error { constructor(message,status=400){super(message);this.status=status;} }
function createApp(env) {
  const clubDb=()=>{if(!env.DB)throw new Failure('Bind a D1 database as DB in Cloudflare settings.',503);return env.DB;};
  const json=(body,status=200)=>Response.json(body,{status});
  const site=()=>new URL(env.SITE_URL).href.split('#')[0];
  async function init(){
    if(!env.OWNER_CODE || env.OWNER_CODE.length<7 || env.OWNER_CODE.length>128)throw new Failure('Set OWNER_CODE to 7–128 characters in Worker Secrets.',503);
    await clubDb().batch(SCHEMA.map(sql=>clubDb().prepare(sql)));
  }
  async function session(request){
    const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
    if(!/^[a-f0-9]{64}$/.test(token))throw new Failure('Owner login required.',401);
    const tokenHash=await hash(token);
    const row=await clubDb().prepare('SELECT * FROM owner_sessions WHERE token_hash=? AND expires_at>? AND code_hash=?').bind(tokenHash,Date.now(),await hash(env.OWNER_CODE)).first();
    if(!row)throw new Failure('Your Owner login expired. Please sign in again.',401);
    return tokenHash;
  }
  async function input(request){
    if(!request.headers.get('content-type')?.includes('application/json'))throw new Failure('JSON required.',415);
    const text=await request.text();if(text.length>30000)throw new Failure('Entry is too long.',413);
    try{return JSON.parse(text);}catch{throw new Failure('Invalid JSON.');}
  }
  const text=(value,max,required=false)=>{
    if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Failure('Please check the required fields and text lengths.');return value.trim();
  };
  const date=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw new Failure('Choose a valid date.');return value;};
  function eventData(v){
    if(!v||typeof v!=='object')throw new Failure('Event data required.');
    const start=text(v.start,5,true),end=text(v.end,5,true);
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||end<=start)throw new Failure('End time must be after start time.');
    return {title:text(v.title,120,true),date:date(v.date),start,end,location:text(v.location,200,true),description:text(v.description||'',5000),category:text(v.category||'Open gym',60,true),cancelled:v.cancelled?1:0};
  }
  function postData(v){return {title:text(v.title,180,true),date:date(v.date),body:text(v.body,20000,true),status:v.status==='published'?'published':'draft',pinned:v.pinned?1:0};}
  async function route(request){
    const url=new URL(request.url),path=url.pathname,db=clubDb();
    if(path==='/api/login'&&request.method==='POST'){
      const body=await input(request);const ip=await hash(request.headers.get('CF-Connecting-IP')||'unknown');
      const now=Date.now();
      const attempt=await db.prepare('INSERT INTO login_attempts(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END RETURNING count').bind(ip,now+900000,now,now).first();
      if(attempt.count>8)throw new Failure('Too many attempts. Try again in 15 minutes.',429);
      const actual=await hash(typeof body.code==='string'?body.code:'');const expected=await hash(env.OWNER_CODE);
      let mismatch=0;for(let i=0;i<64;i++)mismatch|=actual.charCodeAt(i)^expected.charCodeAt(i);
      if(mismatch)throw new Failure('Incorrect Owner code.',401);
      const token=randomToken();await db.prepare('INSERT INTO owner_sessions(token_hash,expires_at,code_hash) VALUES(?,?,?)').bind(await hash(token),now+28800000,expected).run();
      await db.prepare('DELETE FROM login_attempts WHERE key=?').bind(ip).run();return json({token});
    }
    if(path==='/api/club'&&request.method==='GET'){
      const admin=url.searchParams.get('admin')==='1';if(admin)await session(request);
      const events=await db.prepare('SELECT * FROM events ORDER BY date,start').all();
      const posts=await db.prepare(admin?'SELECT * FROM posts ORDER BY pinned DESC,date DESC':"SELECT * FROM posts WHERE status='published' ORDER BY pinned DESC,date DESC").all();
      return json({events:[...events.results,...await publicGoogleEvents(admin)].sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)),posts:posts.results});
    }
    if(path==='/oauth/start'&&request.method==='GET'){
      const ticket=url.searchParams.get('ticket')||'';if(!/^[a-f0-9]{64}$/.test(ticket))throw new Failure('Invalid connection link.');
      const browser=randomToken(),state=randomToken();
      const pending=await db.prepare('UPDATE google_oauth_states SET state_hash=?,browser_hash=? WHERE state_hash=? AND browser_hash IS NULL AND expires_at>? RETURNING session_hash').bind(await hash(state),await hash(browser),await hash(ticket),Date.now()).first();
      if(!pending)throw new Failure('Connection link expired. Return to ECBC and try again.');
      const config=googleConfig();const params=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:scopes.join(' '),access_type:'offline',prompt:'consent select_account',state});
      return new Response(null,{status:303,headers:{Location:'https://accounts.google.com/o/oauth2/v2/auth?'+params,'Set-Cookie':GOOGLE_COOKIE+'='+browser+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600'}});
    }
    if(path==='/oauth/callback'&&request.method==='GET'){
      let outcome='failed';
      try{
        const state=url.searchParams.get('state')||'';
        const browser=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(GOOGLE_COOKIE+'='))?.slice(GOOGLE_COOKIE.length+1)||'';
        if(!/^[a-f0-9]{64}$/.test(state)||!/^[a-f0-9]{64}$/.test(browser))throw new Error('State mismatch');
        const pending=await db.prepare('DELETE FROM google_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING session_hash').bind(await hash(state),await hash(browser),Date.now()).first();
        if(!pending)throw new Error('Expired state');
        const owner=await db.prepare('SELECT token_hash FROM owner_sessions WHERE token_hash=? AND expires_at>? AND code_hash=?').bind(pending.session_hash,Date.now(),await hash(env.OWNER_CODE)).first();
        if(!owner||url.searchParams.has('error')||!url.searchParams.get('code'))throw new Error('Consent failed');
        const token=await tokenRequest({code:url.searchParams.get('code'),grant_type:'authorization_code',redirect_uri:googleConfig().redirectUri});
        const granted=new Set((token.scope||'').split(' '));if(!scopes.filter(s=>s.startsWith('https://')).every(s=>granted.has(s)))throw new Error('Calendar access required');
        const response=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error('Identity failed');const identity=await response.json();
        if(!identity.sub||!identity.email||!identity.email_verified)throw new Error('Identity missing');
        const existing=await db.prepare('SELECT refresh_token FROM google_connections WHERE subject=?').bind(identity.sub).first();
        const encrypted=token.refresh_token?await seal(token.refresh_token):existing?.refresh_token;if(!encrypted)throw new Error('Offline access required');
        await db.batch([
          db.prepare('INSERT INTO google_connections(subject,email,refresh_token) VALUES(?,?,?) ON CONFLICT(subject) DO UPDATE SET email=excluded.email,refresh_token=excluded.refresh_token,error=NULL,revision=google_connections.revision+1,lease=NULL,lease_until=0').bind(identity.sub,identity.email,encrypted),
          db.prepare('INSERT INTO google_owner_links(session_hash,subject) VALUES(?,?) ON CONFLICT(session_hash) DO UPDATE SET subject=excluded.subject').bind(pending.session_hash,identity.sub)
        ]);outcome='connected';
      }catch{/* Do not log tokens or authorization codes. */}
      return new Response(null,{status:303,headers:{Location:site()+'#admin?google='+outcome,'Set-Cookie':GOOGLE_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});
    }
    const owner=await session(request);
    if(path==='/api/google'&&request.method==='GET'){
      if(!googleReady())return json({configured:false,connection:null,calendars:[]});
      const c=await connectionFor(owner);let calendars=[];
      try{if(c&&url.searchParams.get('list')==='1')calendars=await calendarList(c);}catch(e){throw new Failure(e.message,503);}
      return json({configured:true,calendars,connection:c?{email:c.email,calendarId:c.calendar_id,calendarName:c.calendar_name,syncedAt:c.synced_at,error:c.error}:null});
    }
    if(request.method!=='POST')throw new Failure('Not found.',404);
    const body=await input(request);
    if(path==='/api/logout'){await db.prepare('DELETE FROM owner_sessions WHERE token_hash=?').bind(owner).run();return json({ok:true});}
    if(path==='/api/google/connect'){
      try{googleConfig();}catch(e){throw new Failure(e.message,503);}
      const ticket=randomToken();await db.prepare('INSERT INTO google_oauth_states(state_hash,browser_hash,session_hash,expires_at) VALUES(?,NULL,?,?)').bind(await hash(ticket),owner,Date.now()+600000).run();
      return json({url:url.origin+'/oauth/start?ticket='+ticket});
    }
    if(path==='/api/google'){
      const c=await connectionFor(owner);if(!c)throw new Failure('Connect your Google account first.');
      if(body.action==='disconnect'){await db.prepare('DELETE FROM google_connections WHERE subject=?').bind(c.subject).run();return json({ok:true});}
      if(body.action==='select'){
        if(body.publish!==true)throw new Failure('Confirm publication to the ECBC website.');
        let calendar;try{calendar=(await calendarList(c)).find(x=>x.id===body.calendarId);}catch(e){throw new Failure(e.message,503);}
        if(!calendar)throw new Failure('Select a calendar from your account.');
        await db.prepare("UPDATE google_connections SET calendar_id=?,calendar_name=?,snapshot='[]',synced_at=0,error=NULL,revision=revision+1,lease=NULL,lease_until=0 WHERE subject=?").bind(calendar.id,calendar.summary,c.subject).run();
      }else if(body.action!=='sync')throw new Failure('Unknown action.');
      if(body.action==='sync'&&c.synced_at>Date.now()-30000)return json({ok:true});
      await syncConnection(c.subject);const latest=await connectionFor(owner);if(latest?.error)throw new Failure(latest.error,503);return json({ok:true});
    }
    if(path==='/api/import'){
      if(body.confirm!==true)throw new Failure('Confirm importing the existing public schedule.');
      if(await db.prepare("SELECT id FROM content_imports WHERE id='old-site'").first())throw new Failure('The previous site has already been imported.');
      const response=await fetch('https://ecbc-club.ecbc-seunghyeon.workers.dev/api/club',{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Failure('The previous website could not be reached.',503);
      const raw=await response.text();if(raw.length>2000000)throw new Failure('Import too large.');
      const data=JSON.parse(raw);if(!Array.isArray(data.events)||!Array.isArray(data.posts)||data.events.length+data.posts.length>1000)throw new Failure('Import data is invalid or too large.');
      const statements=[];
      for(const [kind,rows,validate] of [['events',data.events,eventData],['posts',data.posts,postData]])for(const row of rows){
        if(row.source==='google')continue;const v=validate(row);const columns=Object.keys(v);
        statements.push(db.prepare('INSERT OR IGNORE INTO '+kind+'(id,'+columns.join(',')+') VALUES(?,'+columns.map(()=>'?').join(',')+')').bind('import-'+text(row.id,300,true),...Object.values(v)));
      }
      statements.push(db.prepare("INSERT INTO content_imports(id,imported_at) VALUES('old-site',?)").bind(new Date().toISOString()));await db.batch(statements);return json({ok:true});
    }
    if(path==='/api/club'){
      const {kind,op,id,version}=body;if(!['events','posts'].includes(kind)||!['create','update','delete'].includes(op))throw new Failure('Invalid action.');
      if(op!=='create'&&(typeof id!=='string'||id.startsWith('google:')||!Number.isInteger(version)))throw new Failure('Edit Google events in Google Calendar. Reload other entries before editing.');
      if(op==='delete'){
        const r=await db.prepare('DELETE FROM '+kind+' WHERE id=? AND version=?').bind(id,version).run();if(!r.meta.changes)throw new Failure('This entry changed. Reload before deleting.',409);return json({ok:true});
      }
      const data=kind==='events'?eventData(body.data):postData(body.data),columns=Object.keys(data);
      if(op==='update'){
        const r=await db.prepare('UPDATE '+kind+' SET '+columns.map(c=>c+'=?').join(',')+',version=version+1 WHERE id=? AND version=?').bind(...Object.values(data),id,version).run();if(!r.meta.changes)throw new Failure('Someone changed this entry. Reload before saving.',409);return json({ok:true});
      }
      const count=kind==='events'?Number(body.data.repeat||1):1;if(!Number.isInteger(count)||count<1||count>12)throw new Failure('Choose 1 to 12 weekly sessions.');
      const statements=[];
      for(let i=0;i<count;i++){const next={...data};if(kind==='events'){const day=new Date(data.date+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+7*i);next.date=day.toISOString().slice(0,10);}
        statements.push(db.prepare('INSERT INTO '+kind+'(id,'+columns.join(',')+') VALUES(?,'+columns.map(()=>'?').join(',')+')').bind(crypto.randomUUID(),...Object.values(next)));
      }await db.batch(statements);return json({ok:true});
    }
    throw new Failure('Not found.',404);
  }
const zone = 'America/New_York';
function local(value) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(value));
    const get = (key) => parts.find(p => p.type === key).value;
    return { date: get('year') + '-' + get('month') + '-' + get('day'), time: get('hour') + ':' + get('minute') };
}
function nextDay(day) {
    const date = new Date(day + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
}
function googleEventRows(calendarKey, event, min, max) {
    // Explicitly private events never become public club entries.
    if (event.status === 'cancelled' || event.visibility === 'private' || !event.start || !event.end)
        return [];
    const allDay = !!event.start.date;
    const start = allDay ? { date: event.start.date, time: '00:00' } : local(event.start.dateTime);
    const end = allDay ? { date: event.end.date, time: '00:00' } : local(event.end.dateTime);
    const rows = [];
    for (let date = start.date < min ? min : start.date; date <= end.date && date < max; date = nextDay(date)) {
        if (date === end.date && end.time === '00:00')
            break;
        rows.push({
            id: 'google:' + calendarKey + ':' + event.id + ':' + date,
            title: event.summary || 'Untitled event', date,
            start: date === start.date ? start.time : '00:00',
            end: date === end.date ? end.time : '24:00',
            location: event.location || '', description: event.description || '',
            category: 'Google Calendar', cancelled: 0, version: 1, allDay,
            source: 'google',
            googleUrl: event.htmlLink?.startsWith('https://www.google.com/calendar/') || event.htmlLink?.startsWith('https://calendar.google.com/')
                ? event.htmlLink : 'https://calendar.google.com/'
        });
    }
    return rows;
}
const GOOGLE_COOKIE = '__Host-ecbc-google-state';
const scopes = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly', 'https://www.googleapis.com/auth/calendar.events.readonly'];
function googleConfig() {
    const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_TOKEN_KEY: tokenKey, GOOGLE_REDIRECT_URI: redirectUri } = env;
    if (!clientId || !clientSecret || !tokenKey || !redirectUri)
        throw new Error('Google Calendar setup is not complete.');
    if (tokenKey.length < 32 || !redirectUri.startsWith('https://'))
        throw new Error('Google Calendar configuration is invalid.');
    return { clientId, clientSecret, tokenKey, redirectUri };
}
function googleReady() { try {
    googleConfig();
    return true;
}
catch {
    return false;
} }
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
async function hash(value) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
async function key() {
    return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(googleConfig().tokenKey)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), new TextEncoder().encode(value)));
    return btoa(String.fromCharCode(...iv, ...ciphertext));
}
async function unseal(value) {
    const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await key(), bytes.slice(12)));
}
class GoogleAccessError extends Error {
}
async function tokenRequest(params) {
    const config = googleConfig();
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }),
        signal: AbortSignal.timeout(15000)
    });
    if (!response.ok)
        throw new GoogleAccessError('Google authorization expired or was denied. Reconnect your account.');
    return await response.json();
}
async function connectionFor(sessionHash) {
    return clubDb().prepare('SELECT c.* FROM google_connections c JOIN google_owner_links l ON c.subject=l.subject WHERE l.session_hash=?').bind(sessionHash).first();
}
async function access(connection) {
    return (await tokenRequest({ grant_type: 'refresh_token', refresh_token: await unseal(connection.refresh_token) })).access_token;
}
async function api(path, token) {
    const response = await fetch('https://www.googleapis.com/calendar/v3/' + path, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) });
    if ([401, 403, 404].includes(response.status))
        throw new GoogleAccessError('Calendar access was lost. Reconnect Google and select a calendar again.');
    if (!response.ok)
        throw new Error('Google Calendar is temporarily unavailable. Automatic sync will retry.');
    return await response.json();
}
async function calendarList(connection) {
    const token = await access(connection);
    const items = [];
    let page = '';
    for (let n = 0; n < 20; n++) {
        const query = new URLSearchParams({ maxResults: '250', minAccessRole: 'reader' });
        if (page)
            query.set('pageToken', page);
        const result = await api('users/me/calendarList?' + query, token);
        items.push(...(result.items || []).map((c) => ({ id: c.id, summary: c.summaryOverride || c.summary || c.id })));
        page = result.nextPageToken;
        if (!page)
            return items;
    }
    throw new Error('Too many calendars. Please contact the site administrator.');
}
async function syncConnection(subject) {
    const db = clubDb();
    const lease = randomToken();
    // Each snapshot is replaced atomically only after every Google page succeeds.
    const connection = await db.prepare('UPDATE google_connections SET lease=?,lease_until=? WHERE subject=? AND calendar_id IS NOT NULL AND lease_until<? RETURNING *')
        .bind(lease, Date.now() + 180000, subject, Date.now()).first();
    if (!connection)
        return;
    try {
        const token = await access(connection);
        const now = new Date();
        const min = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString().slice(0, 10);
        const max = new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
        const calendarKey = await hash(connection.calendar_id);
        const rows = [];
        let page = '';
        for (let n = 0; n < 20; n++) {
            const query = new URLSearchParams({ singleEvents: 'true', showDeleted: 'false', maxResults: '2500', timeMin: min + 'T00:00:00Z', timeMax: max + 'T23:59:59Z', timeZone: 'America/New_York' });
            if (page)
                query.set('pageToken', page);
            const result = await api('calendars/' + encodeURIComponent(connection.calendar_id) + '/events?' + query, token);
            for (const event of (result.items || []))
                rows.push(...googleEventRows(calendarKey, event, min, max));
            if (rows.length > 10000)
                throw new Error('Calendar is too large. Choose a dedicated club calendar.');
            page = result.nextPageToken;
            if (!page)
                break;
        }
        if (page)
            throw new Error('Calendar is too large. Choose a dedicated club calendar.');
        const snapshot = JSON.stringify(rows);
        if (new TextEncoder().encode(snapshot).length > 1500000)
            throw new Error('Calendar is too large. Choose a dedicated club calendar.');
        await db.prepare('UPDATE google_connections SET snapshot=?,synced_at=?,error=NULL WHERE subject=? AND revision=? AND lease=?')
            .bind(snapshot, Date.now(), subject, connection.revision, lease).run();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed. Please retry.';
        // Revoke public visibility after definitive loss of access; retain last good snapshot on transient outages.
        await db.prepare('UPDATE google_connections SET error=?,snapshot=CASE WHEN ? THEN \'[]\' ELSE snapshot END WHERE subject=? AND revision=? AND lease=?')
            .bind(message, error instanceof GoogleAccessError ? 1 : 0, subject, connection.revision, lease).run();
    }
    finally {
        await db.prepare('UPDATE google_connections SET lease=NULL,lease_until=0 WHERE subject=? AND lease=?').bind(subject, lease).run();
    }
}
async function syncGoogleCalendars() {
    if (!googleReady())
        return;
    const db = clubDb();
    await db.prepare('DELETE FROM google_oauth_states WHERE expires_at<?').bind(Date.now()).run();
    await db.prepare('DELETE FROM owner_sessions WHERE expires_at<?').bind(Date.now()).run();
    await db.prepare('DELETE FROM login_attempts WHERE reset_at<?').bind(Date.now()).run();
    const connections = await db.prepare('SELECT subject FROM google_connections WHERE calendar_id IS NOT NULL').all();
    // Isolate failures so one disconnected owner cannot stop other calendars.
    for (const connection of connections.results) {
        try {
            await syncConnection(connection.subject);
        }
        catch {
            console.error('Google sync storage failure');
        }
    }
}
async function publicGoogleEvents(admin) {
    if (!googleReady())
        return [];
    const result = await clubDb().prepare('SELECT calendar_id,snapshot FROM google_connections WHERE calendar_id IS NOT NULL ORDER BY synced_at DESC').all();
    const calendars = new Set();
    const events = [];
    for (const row of result.results) {
        if (calendars.has(row.calendar_id))
            continue;
        calendars.add(row.calendar_id);
        const items = JSON.parse(row.snapshot);
        events.push(...items.map(({ googleUrl, ...item }) => admin ? { ...item, googleUrl } : item));
    }
    return events;
}

  return {init,route,syncGoogleCalendars};
}
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS events (\n  id TEXT PRIMARY KEY NOT NULL,\n  title TEXT NOT NULL,\n  date TEXT NOT NULL,\n  start TEXT NOT NULL,\n  end TEXT NOT NULL,\n  location TEXT NOT NULL,\n  description TEXT DEFAULT '' NOT NULL,\n  category TEXT DEFAULT 'Open gym' NOT NULL,\n  cancelled INTEGER DEFAULT 0 NOT NULL,\n  version INTEGER DEFAULT 1 NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS events_date_idx ON events (date)",
  "CREATE TABLE IF NOT EXISTS posts (\n  id TEXT PRIMARY KEY NOT NULL,\n  title TEXT NOT NULL,\n  body TEXT NOT NULL,\n  date TEXT NOT NULL,\n  status TEXT DEFAULT 'draft' NOT NULL,\n  pinned INTEGER DEFAULT 0 NOT NULL,\n  version INTEGER DEFAULT 1 NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS posts_status_date_idx ON posts (status, date)",
  "CREATE TABLE IF NOT EXISTS content_imports (\n  id TEXT PRIMARY KEY NOT NULL,\n  imported_at TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS login_attempts (\n  key TEXT PRIMARY KEY NOT NULL,\n  count INTEGER NOT NULL,\n  reset_at INTEGER NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS owner_sessions (\n  token_hash TEXT PRIMARY KEY NOT NULL,\n  expires_at INTEGER NOT NULL,\n  code_hash TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS google_connections (\n  subject TEXT PRIMARY KEY,\n  email TEXT NOT NULL,\n  refresh_token TEXT NOT NULL,\n  calendar_id TEXT,\n  calendar_name TEXT,\n  snapshot TEXT NOT NULL DEFAULT '[]',\n  synced_at INTEGER NOT NULL DEFAULT 0,\n  error TEXT,\n  revision INTEGER NOT NULL DEFAULT 0,\n  lease TEXT,\n  lease_until INTEGER NOT NULL DEFAULT 0\n)",
  "CREATE TABLE IF NOT EXISTS google_owner_links (\n  session_hash TEXT PRIMARY KEY REFERENCES owner_sessions(token_hash) ON DELETE CASCADE,\n  subject TEXT NOT NULL REFERENCES google_connections(subject) ON DELETE CASCADE\n)",
  "CREATE TABLE IF NOT EXISTS google_oauth_states (\n  state_hash TEXT PRIMARY KEY,\n  browser_hash TEXT,\n  session_hash TEXT NOT NULL REFERENCES owner_sessions(token_hash) ON DELETE CASCADE,\n  expires_at INTEGER NOT NULL\n)"
];
