import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  '.env.example',
  'vercel.json',
  'api/health.ts',
  'api/internal/automation/process-due.ts',
  '.github/workflows/ci.yml',
];

const fail = (message) => {
  console.error(`[preflight] FAIL: ${message}`);
  process.exitCode = 1;
};

for (const relativePath of requiredFiles) {
  try {
    await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    fail(`missing required file: ${relativePath}`);
  }
}

const envExample = await readFile(path.join(root, '.env.example'), 'utf8').catch(() => '');
for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'ENCRYPTION_SECRET']) {
  if (!new RegExp(`^\\s*${key}=\\s*\`, 'm').test(envExample)) {
    fail(`.env.example is missing ${key}`);
  }
}

const vercelConfig = await readFile(path.join(root, 'vercel.json'), 'utf8').catch(() => '');
if (!vercelConfig.includes('/api/internal/automation/process-due')) {
  fail('vercel.json does not register the automation cron path');
}

const health = await readFile(path.join(root, 'api/health.ts'), 'utf8').catch(() => '');
for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET']) {
  if (!health.includes(`envCheck('${key}', true)`)) {
    fail(`health endpoint does not require ${key}`);
  }
}

const cron = await readFile(path.join(root, 'api/internal/automation/process-due.ts'), 'utf8').catch(() => '');
if (!cron.includes('timingSafeSecretCompare') || !cron.includes('claim_due_automation_actions')) {
  fail('cron worker is missing constant-time auth or atomic due-action claiming');
}

async function walk(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const sourceFiles = await walk(path.join(root, 'src')).catch(() => []);
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  if (/localStorage\.(setItem|removeItem)\\s*\\(\\s*['"][^'"]*(token|access|secret)/i.test(source)) {
    fail(`possible sensitive browser storage write in ${path.relative(root, file)}`);
  }
}

if (process.exitCode) {
  throw new Error('Production preflight failed.');
}

console.log('[preflight] PASS: required deployment, auth, cron, and token-storage checks passed.');
