// Verifies the unpacked extension in dist/ is loadable and follows the rules in docs/.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const required = [
  'manifest.json',
  'content.js',
  'popup.html',
  'popup.js',
  'background.js',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

const errors = [];

for (const file of required) {
  if (!existsSync(join(dist, file))) errors.push(`missing dist/${file}`);
}

if (existsSync(join(dist, 'content.js'))) {
  const content = readFileSync(join(dist, 'content.js'), 'utf8');
  if (/(^|[;\s}])import\s*[\s{*"'(]|(^|[;\s}])export\s*[{*]|\bimport\.meta\b/.test(content)) {
    errors.push('dist/content.js must be a single IIFE without import/export statements');
  }
}

if (existsSync(join(dist, 'manifest.json'))) {
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
  const perms = JSON.stringify(manifest.permissions ?? []);
  if (perms !== '["storage"]') errors.push(`permissions must be ["storage"], got ${perms}`);
  if (manifest.host_permissions) errors.push('host_permissions are not allowed');
}

if (errors.length > 0) {
  console.error(`check-build failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('check-build: dist/ is a valid Pawsor extension');
