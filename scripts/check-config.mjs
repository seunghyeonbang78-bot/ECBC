import { readFileSync } from 'node:fs';

const config = JSON.parse(
  readFileSync(
    new URL('../wrangler.json', import.meta.url),
    'utf8'
  )
);

const id = config.d1_databases
  ?.find(database => database.binding === 'DB')
  ?.database_id;

if (
  !id ||
  id === '00000000-0000-4000-8000-000000000000'
) {
  console.error(
    'Create your Cloudflare D1 database and put its database_id in wrangler.json.'
  );
  process.exit(1);
}
