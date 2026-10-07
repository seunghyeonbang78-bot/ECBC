import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

const mode = process.argv[2];

if (!['local', 'remote'].includes(mode)) {
  console.error('Use: pnpm owner:setup local OR remote');
  process.exit(1);
}

if (mode === 'remote') {
  await import('./check-config.mjs');
}

if (!process.stdin.isTTY) {
  console.error('Run this command in an interactive terminal.');
  process.exit(1);
}

// 입력한 비밀번호를 화면에 표시하지 않습니다.
function askPassword(prompt) {
  return new Promise((resolve) => {
    const hiddenOutput = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });

    const rl = createInterface({
      input: process.stdin,
      output: hiddenOutput,
      terminal: true,
      historySize: 0,
    });

    process.stdout.write(prompt);

    rl.on('SIGINT', () => {
      rl.close();
      process.stdout.write('\nCancelled.\n');
      process.exit(1);
    });

    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = await askPassword('New owner password: ');

if (
  password.length < 7 ||
  password.length > 128 ||
  password !== password.trim()
) {
  console.error(
    'Use 7–128 characters, with no spaces at the beginning or end.'
  );
  process.exit(1);
}

const confirmation = await askPassword('Confirm password: ');

if (password !== confirmation) {
  console.error('Passwords do not match. Please run again.');
  process.exit(1);
}

const hash = createHash('sha256')
  .update(password)
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
    .filter((line) => !/^OWNER_CODE_SHA256\s*=/.test(line))
    .join('\n')
    .trim();

  writeFileSync(
    path,
    `${rest ? rest + '\n' : ''}OWNER_CODE_SHA256=${hash}\n`,
    { mode: 0o600 }
  );
} else {
  const wrangler = fileURLToPath(
    new URL(
      '../node_modules/wrangler/bin/wrangler.js',
      import.meta.url
    )
  );

  const result = spawnSync(
    process.execPath,
    [
      wrangler,
      'secret',
      'put',
      'OWNER_CODE_SHA256',
      '--config',
      'wrangler.json',
    ],
    {
      input: hash + '\n',
      stdio: ['pipe', 'inherit', 'inherit'],
    }
  );

  if (result.error) throw result.error;

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('\nOwner password updated successfully.');
console.log('Sign in at /admin using your new password.');
