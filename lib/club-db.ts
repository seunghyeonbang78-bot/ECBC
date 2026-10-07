import { env } from 'cloudflare:workers';

export function clubDb() {
  if (!env.DB) {
    throw new Error('Club storage unavailable');
  }

  return env.DB;
}
