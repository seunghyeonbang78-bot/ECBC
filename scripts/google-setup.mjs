import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
async function ask(label) {
  const output = new Writable({write(_chunk, _encoding, callback) { callback(); }});
  const rl = createInterface({input:process.stdin,output,terminal:true,historySize:0});
  process.stdout.write(label);
  rl.on('SIGINT', () => { rl.close(); process.exit(1); });
  return new Promise(resolve => rl.question('', answer => { rl.close(); process.stdout.write('\n'); resolve(answer.trim()); }));
}
const clientId = await ask('Google OAuth Client ID (hidden): ');
if (!clientId.endsWith('.apps.googleusercontent.com')) throw new Error('Use a Google Web application OAuth Client ID.');
const secret = await ask('Google OAuth Client secret (hidden): ');
if (!secret) throw new Error('Client secret is required.');
const key = await ask('Existing GOOGLE_TOKEN_KEY, or Enter to generate one for FIRST setup only (hidden): ');
if (key && !/^[a-f0-9]{64}$/i.test(key)) throw new Error('The existing key must contain 64 hexadecimal characters.');
const wranglerPackage = require.resolve('wrangler/package.json');
const wrangler = new URL('./bin/wrangler.js', 'file://' + wranglerPackage).pathname;
const config = JSON.parse(readFileSync('wrangler.json','utf8'));
console.log('Worker:', config.name);
console.log('Redirect URI:', config.vars?.GOOGLE_REDIRECT_URI);
if (!key) console.log('First setup: creating a new encryption key. Existing Google connections, if any, will need to reconnect.');
for (const [name, value] of Object.entries({GOOGLE_CLIENT_ID:clientId,GOOGLE_CLIENT_SECRET:secret,GOOGLE_TOKEN_KEY:key || randomBytes(32).toString('hex')})) {
  const result = spawnSync(process.execPath,[wrangler,'secret','put',name,'--config','wrangler.json'],{input:value+'\n',stdio:['pipe','inherit','inherit']});
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Google secrets saved. Follow GOOGLE_CALENDAR_SETUP.md to migrate, build and deploy.');
