const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Source generation only. This command never deploys migrations or starts a DB.
// prisma.config.ts requires DATABASE_URL even when CI only generates the client.
// The fallback is supplied only to this child process, never saved to an env file
// or used by the API process that runs after this command exits.
const backendRoot = path.resolve(__dirname, '..');
// Read the installed CLI's bin metadata directly. The package root export
// may resolve to type-only files instead of its executable entrypoint.
const prismaRoot = path.join(backendRoot, 'node_modules', 'prisma');
const manifest = JSON.parse(fs.readFileSync(path.join(prismaRoot, 'package.json'), 'utf8'));
const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.prisma;
if (typeof bin !== 'string' || !bin) {
  console.error('Installed Prisma package has no CLI bin entry');
  process.exit(1);
}
const cli = path.resolve(prismaRoot, bin);
const env = { ...process.env };
if (!env.DATABASE_URL || !env.DATABASE_URL.trim()) {
  env.DATABASE_URL = 'postgresql://build:build@localhost:5432/build_only';
}

const result = spawnSync(process.execPath, [cli, 'generate'], {
  cwd: backendRoot,
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error('Unable to start Prisma Client generation');
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
