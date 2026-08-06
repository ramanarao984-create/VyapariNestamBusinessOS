import {rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['dist', 'server.js'];

await Promise.all(
  targets.map((target) => rm(path.join(root, target), {force: true, recursive: true})),
);
