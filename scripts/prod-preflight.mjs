import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = ['.env.example', 'vercel.json', 'api/health.ts', 'api/internal/automation/process-due.ts', '.github/workflows/ci.yml'];
const failures = [];
const read = (file) => readFile(path.join(root, file), 'utf8');

for (const file of requiredFiles) {
  try { await read(file); } catch { failures.push('missing required file: ' + file); }
}

const envExample = await read('.env.example').catch(() => '');
for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'ENCRYPTION_SECRET']) {
  if (!envExample.split(/\r?\n/).some((line) => line.trimStart().startsWith(key + '='))) failures.push('.env.example is missing ' + key);
}

const vercelConfig = await read('vercel.json').catch(() => '');
if (!vercelConfig.includes('/api/internal/automation/process-due')) failures.push('vercel.json does not register the automation cron path');

const health = await read('api/health.ts').catch(() => '');
for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET']) {
  if (!health.includes("envCheck('" + key + "', true)")) failures.push('health endpoint does not require ' + key);
}

const cron = await read('api/internal/automation/process-due.ts').catch(() => '');
if (!cron.includes('timingSafeSecretCompare') || !cron.includes('claim_due_automation_actions')) failures.push('cron worker is missing constant-time auth or atomic claiming');

async function walk(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const file of await walk(path.join(root, 'src')).catch(() => [])) {
  const source = await readFile(file, 'utf8');
  if (/localStorage\.(setItem|removeItem)\s*\(\s*['"][^'"]*(token|access|secret)/i.test(source)) failures.push('possible sensitive browser storage write in ' + path.relative(root, file));
}

if (failures.length) {
  for (const failure of failures) console.error('[preflight] FAIL: ' + failure);
  process.exit(1);
}
console.log('[preflight] PASS: deployment, auth, cron, and token-storage checks passed.');