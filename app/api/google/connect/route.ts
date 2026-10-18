import { cookies } from 'next/headers';
import { ownerUser } from '@/lib/owner';
import { clubDb } from '@/lib/club-db';
import { GOOGLE_COOKIE, googleConfig, hash, randomToken, scopes } from '@/lib/google-calendar';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response('Forbidden', { status: 403 });
  const owner = await ownerUser();
  if (!owner) return new Response('Owner login required', { status: 403 });
  try {
    const config = googleConfig();
    if (new URL(config.redirectUri).origin !== new URL(request.url).origin) throw new Error('Use the configured website address to connect Google.');
    const state = randomToken(), browser = randomToken();
    await clubDb().prepare('INSERT INTO google_oauth_states(state_hash,browser_hash,session_hash,expires_at) VALUES(?,?,?,?)')
      .bind(await hash(state), await hash(browser), owner.sessionHash, Date.now() + 600000).run();
    (await cookies()).set(GOOGLE_COOKIE, browser, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
    const query = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: scopes.join(' '), access_type: 'offline', prompt: 'consent select_account', state });
    return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + query, 303);
  } catch {
    return Response.redirect(new URL('/admin?google=setup', request.url), 303);
  }
}
