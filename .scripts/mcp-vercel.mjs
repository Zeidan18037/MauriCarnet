import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(path) {
  try {
    const content = readFileSync(path, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

loadDotEnv(resolve(__dirname, '..', '.env.local'));

const token = process.env.VERCEL_API_TOKEN;
if (!token) {
  process.stderr.write('[vercel-mcp] VERCEL_API_TOKEN not set\n');
  process.exit(1);
}

const child = spawn(
  'npx',
  ['-y', 'vercel-mcp-server'],
  { stdio: ['pipe', 'pipe', 'pipe'], shell: true, env: { ...process.env, VERCEL_API_TOKEN: token } }
);

let stderrBuffer = '';
child.stderr.on('data', (chunk) => { stderrBuffer += chunk.toString(); });
child.stderr.on('end', () => {
  if (stderrBuffer) process.stderr.write(`[vercel-mcp] stderr: ${stderrBuffer}\n`);
});

process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr, { end: false });

child.on('exit', (code) => {
  process.stderr.write(`[vercel-mcp] exited with code ${code}\n`);
  process.exit(code);
});
child.on('error', (err) => { process.stderr.write(`[vercel-mcp] spawn error: ${err.message}\n`); process.exit(1); });
