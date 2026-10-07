import { cookies } from 'next/headers';
import { clubDb } from './club-db';

export const OWNER_COOKIE = '__Host-ecbc-owner';

export async function digest(value: string) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );

  return Array.from(
    new Uint8Array(buffer),
    byte => byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function ownerUser() {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const row = await clubDb()
    .prepare(
      'SELECT token_hash FROM owner_sessions ' +
      'WHERE token_hash = ? AND expires_at > ?'
    )
    .bind(await digest(token), Date.now())
    .first();

  return row ? { displayName: 'Owner' } : null;
}
