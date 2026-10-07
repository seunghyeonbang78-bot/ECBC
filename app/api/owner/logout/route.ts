import { cookies } from 'next/headers';
import { clubDb } from '@/lib/club-db';
import { digest, OWNER_COOKIE } from '@/lib/owner';

export async function POST(request: Request) {
  if (
    request.headers.get('origin') !==
    new URL(request.url).origin
  ) {
    return new Response('Forbidden', { status: 403 });
  }

  const token = (await cookies()).get(OWNER_COOKIE)?.value;

  if (token) {
    await clubDb()
      .prepare(
        'DELETE FROM owner_sessions WHERE token_hash = ?'
      )
      .bind(await digest(token))
      .run();
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/admin',
      'Cache-Control': 'no-store',
      'Set-Cookie':
        `${OWNER_COOKIE}=; Path=/; HttpOnly; ` +
        'Secure; SameSite=Strict; Max-Age=0'
    }
  });
}
