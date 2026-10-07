import { env } from 'cloudflare:workers';
import { clubDb } from '@/lib/club-db';
import { digest, OWNER_COOKIE } from '@/lib/owner';

export const dynamic = 'force-dynamic';

const reply = (error: string, status: number) =>
  Response.json(
    { error },
    {
      status,
      headers: { 'Cache-Control': 'no-store' }
    }
  );

export async function POST(request: Request) {
  if (
    request.headers.get('origin') !==
    new URL(request.url).origin
  ) {
    return reply('Request origin not allowed.', 403);
  }

  if (
    !request.headers.get('content-type')
      ?.includes('application/json')
  ) {
    return reply('JSON required.', 415);
  }

  const expected = (
    env as unknown as { OWNER_CODE_SHA256?: string }
  ).OWNER_CODE_SHA256;

  if (!expected) {
    return reply('Owner login is not configured.', 503);
  }

  try {
    const db = clubDb();
    const now = Date.now();

    const key = await digest(
      'owner-login:' +
      (request.headers.get('cf-connecting-ip') || 'unknown')
    );

    const attempt = await db.prepare(
      'INSERT INTO login_attempts (key,count,reset_at) ' +
      'VALUES (?,1,?) ' +
      'ON CONFLICT(key) DO UPDATE SET ' +
      'count = CASE WHEN reset_at <= ? THEN 1 ELSE count+1 END, ' +
      'reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END ' +
      'RETURNING count'
    ).bind(
      key,
      now + 15 * 60 * 1000,
      now,
      now,
      now + 15 * 60 * 1000
    ).first<{ count: number }>();

    if (!attempt || attempt.count > 8) {
      return reply(
        'Too many attempts. Please try again in 15 minutes.',
        429
      );
    }

    const raw = await request.text();

    if (raw.length > 1024) {
      return reply('Invalid code.', 400);
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return reply('Invalid code.', 400);
    }

    if (
      typeof data.code !== 'string' ||
      data.code.length > 128
    ) {
      return reply('Invalid code.', 400);
    }

    const actual = await digest(data.code.trim());

    let difference = expected.length ^ actual.length;

    for (let i = 0; i < actual.length; i++) {
      difference |=
        actual.charCodeAt(i) ^
        (expected.charCodeAt(i) || 0);
    }

    if (difference) {
      return reply('Incorrect administrator code.', 401);
    }

    const token = Array.from(
      crypto.getRandomValues(new Uint8Array(32)),
      byte => byte.toString(16).padStart(2, '0')
    ).join('');

    await db.batch([
      db.prepare(
        'DELETE FROM owner_sessions WHERE expires_at <= ?'
      ).bind(now),

      db.prepare(
        'DELETE FROM login_attempts WHERE reset_at <= ? OR key = ?'
      ).bind(now, key),

      db.prepare(
        'INSERT INTO owner_sessions (token_hash,expires_at) VALUES (?,?)'
      ).bind(
        await digest(token),
        now + 8 * 60 * 60 * 1000
      )
    ]);

    return Response.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie':
            `${OWNER_COOKIE}=${token}; Path=/; HttpOnly; ` +
            'Secure; SameSite=Strict; Max-Age=28800'
        }
      }
    );
  } catch {
    return reply(
      'Login is temporarily unavailable. Please try again.',
      503
    );
  }
}
