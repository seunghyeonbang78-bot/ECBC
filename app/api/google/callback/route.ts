import { cookies } from 'next/headers';
import { clubDb } from '@/lib/club-db';
import { GOOGLE_COOKIE, googleConfig, hash, seal, scopes, tokenRequest } from '@/lib/google-calendar';
export async function GET(request: Request) {
  const jar = await cookies();
  const url = new URL(request.url);
  const browser = jar.get(GOOGLE_COOKIE)?.value || '';
  jar.set(GOOGLE_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  let status = 'failed';
  try {
    const state = url.searchParams.get('state') || '';
    if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(browser)) throw new Error('Invalid state');
    const db = clubDb();
    // Single-use state, tied to the initiating browser and a still-valid owner session.
    // The existing Strict owner cookie is intentionally not required on Google's redirect.
    const pending = await db.prepare('DELETE FROM google_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING session_hash')
      .bind(await hash(state), await hash(browser), Date.now()).first<{session_hash: string}>();
    if (!pending) throw new Error('Expired state');
    const session = await db.prepare('SELECT token_hash FROM owner_sessions WHERE token_hash=? AND expires_at>?').bind(pending.session_hash, Date.now()).first();
    if (!session) throw new Error('Expired owner session');
    if (url.searchParams.has('error')) throw new Error('Google consent cancelled');
    const code = url.searchParams.get('code');
    if (!code) throw new Error('Missing code');
    const token = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: googleConfig().redirectUri });
    const granted = new Set((token.scope || '').split(' '));
    if (!scopes.filter(s => s.startsWith('https://')).every(s => granted.has(s))) throw new Error('Calendar permissions required');
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + token.access_token }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Identity check failed');
    const identity = await response.json() as { sub: string; email: string; email_verified: boolean };
    if (!identity.sub || !identity.email || !identity.email_verified) throw new Error('Verified Google identity required');
    const existing = await db.prepare('SELECT refresh_token FROM google_connections WHERE subject=?').bind(identity.sub).first<{refresh_token: string}>();
    const encrypted = token.refresh_token ? await seal(token.refresh_token) : existing?.refresh_token;
    if (!encrypted) throw new Error('Offline permission required');
    await db.batch([
      db.prepare('INSERT INTO google_connections(subject,email,refresh_token) VALUES(?,?,?) ON CONFLICT(subject) DO UPDATE SET email=excluded.email,refresh_token=excluded.refresh_token,error=NULL,revision=google_connections.revision+1,lease=NULL,lease_until=0').bind(identity.sub, identity.email, encrypted),
      db.prepare('INSERT INTO google_owner_links(session_hash,subject) VALUES(?,?) ON CONFLICT(session_hash) DO UPDATE SET subject=excluded.subject').bind(pending.session_hash, identity.sub)
    ]);
    status = 'connected';
  } catch { /* Never log authorization codes, tokens, or Google responses. */ }
  return new Response(null, { status: 303, headers: { Location: '/admin?google=' + status, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
