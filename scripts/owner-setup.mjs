import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2];

if (!['local', 'remote'].includes(mode)) {
  console.error(
    'Usage: pnpm owner:setup local OR pnpm owner:setup remote'
  );
  process.exit(1);
}

if (mode === 'remote') {
  await import('./check-config.mjs');
}

const code = randomBytes(18).toString('base64url');

const hash = createHash('sha256')
  .update(code)
  .digest('hex');

if (mode === 'local') {
  const path = new URL('../.dev.vars', import.meta.url);
  let prior = '';

  try {
    prior = readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const rest = prior
    .split('\n')
    .filter(line => !/^OWNER_CODE_SHA256\s*=/.test(line))
    .join('\n')
    .trim();

  writeFileSync(
    path,
    (rest ? rest + '\n' : '') +
      `OWNER_CODE_SHA256=${hash}\n`,
    { mode: 0o600 }
  );
} else {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL(
          '../node_modules/wrangler/bin/wrangler.js',
          import.meta.url
        )
      ),
      'secret',
      'put',
      'OWNER_CODE_SHA256',
      '--config',
      'wrangler.json'
    ],
    {
      input: hash + '\n',
      stdio: ['pipe', 'inherit', 'inherit']
    }
  );

  if (result.error) throw result.error;

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(
  `\nYour NEW ${mode} owner code (save it privately):\n\n` +
  `${code}\n\n` +
  'Sign in at /admin. Never commit this code. ' +
  'Running this again changes your code.'
);
