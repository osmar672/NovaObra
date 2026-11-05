// Parchear únicamente las herramientas de pruebas. npm ci --omit=dev no las instala.
const { spawnSync } = require('node:child_process');
const { dirname, resolve } = require('node:path');
const root = resolve(__dirname, '..');
try { require.resolve('newman/package.json', { paths: [root] }); }
catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') process.exit(0);
  throw error;
}
const cli = resolve(dirname(require.resolve('patch-package/package.json', { paths: [root] })), 'index.js');
const result = spawnSync(process.execPath, [cli, '--error-on-fail'], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status === null ? 1 : result.status;
