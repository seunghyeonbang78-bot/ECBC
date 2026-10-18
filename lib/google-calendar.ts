import { env } from 'cloudflare:workers';
import { clubDb } from './club-db';
import { googleEventRows, type GoogleEvent } from './google-events';
import type { ClubEvent } from './club-types';

export const GOOGLE_COOKIE = '__Host-ecbc-google-state';
export const scopes = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly', 'https://www.googleapis.com/auth/calendar.events.readonly'];
export function googleConfig() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_TOKEN_KEY: tokenKey, GOOGLE_REDIRECT_URI: redirectUri } = env;
  if (!clientId || !clientSecret || !tokenKey || !redirectUri) throw new Error('Google Calendar setup is not complete.');
  if (!/^[a-f0-9]{64}$/i.test(tokenKey) || !redirectUri.startsWith('https://')) throw new Error('Google Calendar configuration is invalid.');
  return { clientId, clientSecret, tokenKey, redirectUri };
}
export function googleReady() { try { googleConfig(); return true; } catch { return false; } }
export const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
export async function hash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
async function key() {
  return crypto.subtle.importKey('raw', Uint8Array.from(googleConfig().tokenKey.match(/../g)!, x => parseInt(x, 16)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...iv, ...ciphertext));
}
async function unseal(value: string) {
  const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await key(), bytes.slice(12)));
}
export class GoogleAccessError extends Error {}
export async function tokenRequest(params: Record<string, string>) {
  const config = googleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new GoogleAccessError('Google authorization expired or was denied. Reconnect your account.');
  return await response.json() as { access_token: string; refresh_token?: string; scope?: string };
}
export type Connection = { subject: string; email: string; refresh_token: string; calendar_id: string | null; calendar_name: string | null; snapshot: string; synced_at: number; error: string | null; revision: number; lease: string | null; lease_until: number };
export async function connectionFor(sessionHash: string) {
  return clubDb().prepare('SELECT c.* FROM google_connections c JOIN google_owner_links l ON c.subject=l.subject WHERE l.session_hash=?').bind(sessionHash).first<Connection>();
}
async function access(connection: Connection) {
  return (await tokenRequest({ grant_type: 'refresh_token', refresh_token: await unseal(connection.refresh_token) })).access_token;
}
async function api(path: string, token: string) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/' + path, { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) });
  if ([401, 403, 404].includes(response.status)) throw new GoogleAccessError('Calendar access was lost. Reconnect Google and select a calendar again.');
  if (!response.ok) throw new Error('Google Calendar is temporarily unavailable. Automatic sync will retry.');
  return await response.json() as any;
}
export async function calendarList(connection: Connection) {
  const token = await access(connection);
  const items: { id: string; summary: string }[] = [];
  let page = '';
  for (let n = 0; n < 20; n++) {
    const query = new URLSearchParams({ maxResults: '250', minAccessRole: 'reader' });
    if (page) query.set('pageToken', page);
    const result = await api('users/me/calendarList?' + query, token);
    items.push(...(result.items || []).map((c: any) => ({ id: c.id, summary: c.summaryOverride || c.summary || c.id })));
    page = result.nextPageToken;
    if (!page) return items;
  }
  throw new Error('Too many calendars. Please contact the site administrator.');
}
export async function syncConnection(subject: string) {
  const db = clubDb();
  const lease = randomToken();
  // Each snapshot is replaced atomically only after every Google page succeeds.
  const connection = await db.prepare('UPDATE google_connections SET lease=?,lease_until=? WHERE subject=? AND calendar_id IS NOT NULL AND lease_until<? RETURNING *')
    .bind(lease, Date.now() + 180000, subject, Date.now()).first<Connection>();
  if (!connection) return;
  try {
    const token = await access(connection);
    const now = new Date();
    const min = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const max = new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
    const calendarKey = await hash(connection.calendar_id!);
    const rows: ClubEvent[] = [];
    let page = '';
    for (let n = 0; n < 20; n++) {
      const query = new URLSearchParams({ singleEvents: 'true', showDeleted: 'false', maxResults: '2500', timeMin: min + 'T00:00:00-05:00', timeMax: max + 'T00:00:00-05:00', timeZone: 'America/New_York' });
      if (page) query.set('pageToken', page);
      const result = await api('calendars/' + encodeURIComponent(connection.calendar_id!) + '/events?' + query, token);
      for (const event of (result.items || []) as GoogleEvent[]) rows.push(...googleEventRows(calendarKey, event, min, max));
      if (rows.length > 10000) throw new Error('Calendar is too large. Choose a dedicated club calendar.');
      page = result.nextPageToken;
      if (!page) break;
    }
    if (page) throw new Error('Calendar is too large. Choose a dedicated club calendar.');
    const snapshot = JSON.stringify(rows);
    if (new TextEncoder().encode(snapshot).length > 1500000) throw new Error('Calendar is too large. Choose a dedicated club calendar.');
    await db.prepare('UPDATE google_connections SET snapshot=?,synced_at=?,error=NULL WHERE subject=? AND revision=? AND lease=?')
      .bind(snapshot, Date.now(), subject, connection.revision, lease).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed. Please retry.';
    // Revoke public visibility after definitive loss of access; retain last good snapshot on transient outages.
    await db.prepare('UPDATE google_connections SET error=?,snapshot=CASE WHEN ? THEN \'[]\' ELSE snapshot END WHERE subject=? AND revision=? AND lease=?')
      .bind(message, error instanceof GoogleAccessError ? 1 : 0, subject, connection.revision, lease).run();
  } finally {
    await db.prepare('UPDATE google_connections SET lease=NULL,lease_until=0 WHERE subject=? AND lease=?').bind(subject, lease).run();
  }
}
export async function syncGoogleCalendars() {
  if (!googleReady()) return;
  const db = clubDb();
  await db.prepare('DELETE FROM google_oauth_states WHERE expires_at<?').bind(Date.now()).run();
  const connections = await db.prepare('SELECT subject FROM google_connections WHERE calendar_id IS NOT NULL').all<{subject: string}>();
  // Isolate failures so one disconnected owner cannot stop other calendars.
  for (const connection of connections.results) {
    try { await syncConnection(connection.subject); } catch { console.error('Google sync storage failure'); }
  }
}
export async function publicGoogleEvents(admin: boolean) {
  if (!googleReady()) return [];
  const result = await clubDb().prepare('SELECT calendar_id,snapshot FROM google_connections WHERE calendar_id IS NOT NULL ORDER BY synced_at DESC').all<{ calendar_id: string; snapshot: string }>();
  const calendars = new Set<string>();
  const events: ClubEvent[] = [];
  for (const row of result.results) {
    if (calendars.has(row.calendar_id)) continue;
    calendars.add(row.calendar_id);
    const items = JSON.parse(row.snapshot) as ClubEvent[];
    events.push(...items.map(({ googleUrl, ...item }) => admin ? { ...item, googleUrl } : item));
  }
  return events;
}
