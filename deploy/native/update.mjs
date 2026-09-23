import {
  appendFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  assertRuntime,
  databaseTarget,
  readManifest,
  readProtectedEnv,
  validateAppEnv,
} from './runtime.mjs';

function command(program, args) {
  const result = spawnSync(program, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`${program} failed; update stopped`);
}

export async function activate({
  release,
  root,
  version,
  backupReference,
  run = command,
  verify,
  log = console.log,
}) {
  const current = resolve(root, 'current');
  const previous = existsSync(current) ? readlinkSync(current) : null;
  const record = (phase) =>
    appendFileSync(
      resolve(root, 'deployments.jsonl'),
      `${JSON.stringify({ at: new Date().toISOString(), version, previous, backupReference, phase })}\n`,
      { mode: 0o600 }
    );
  record('starting');
  try {
    // Deliberately stop before SQL: no app or in-process scheduler writes during migration.
    await run('sudo', ['-n', '/bin/systemctl', 'stop', 'iam']);
    record('stopped');
    await run(process.execPath, [
      resolve(release, 'ops/migrate.mjs'),
      resolve(root, 'shared/migration.env'),
    ]);
    record('migrated');
    const next = resolve(root, `.current-${process.pid}`);
    try {
      symlinkSync(release, next);
      renameSync(next, current);
    } finally {
      if (existsSync(next)) unlinkSync(next);
    }
    record('activated');
    await run('sudo', ['-n', '/bin/systemctl', 'restart', 'iam']);
    await verify();
    record('healthy');
    log(`Release verified: ${version}`);
  } catch (error) {
    record('failed');
    // A failed health check after restart must not leave a broken app/scheduler running.
    try {
      await run('sudo', ['-n', '/bin/systemctl', 'stop', 'iam']);
    } catch {
      log('Could not stop iam; ask the administrator to check its state immediately.');
    }
    throw new Error(
      `${error.message}. No automatic rollback. Inspect deployments.jsonl and the DB before recovery.`
    );
  }
}

export async function verifyHealth(port, version, { timeoutMs = 90_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let successes = 0;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        redirect: 'error',
        signal: AbortSignal.timeout(5_000),
        headers: { 'cache-control': 'no-cache' },
      });
      const body = await response.json();
      successes =
        response.ok && body.status === 'ok' && body.version === version ? successes + 1 : 0;
      if (successes >= 3) return;
    } catch {
      successes = 0;
    }
    await sleep(2_000);
  }
  throw new Error('The expected application version did not become healthy');
}

export async function main(argv) {
  if (!argv.length || argv.includes('--help')) {
    console.log(
      'Usage: node RELEASE/ops/update.mjs --check | --apply --backup-reference=ID [--allow-provisional]\nRoot is inferred from /srv/iam/releases/VERSION. Needs a preinstalled iam.service and stop/restart permissions.'
    );
    return;
  }
  if (
    argv.some(
      (arg) =>
        !['--check', '--apply', '--allow-provisional'].includes(arg) &&
        !/^--backup-reference=[a-zA-Z0-9._:-]{1,120}$/.test(arg)
    ) ||
    argv.includes('--check') === argv.includes('--apply')
  )
    throw new Error('Invalid arguments; use --help');
  assertRuntime();
  const release = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
  const root = dirname(dirname(release));
  const manifest = readManifest(release);
  if (basename(dirname(release)) !== 'releases' || basename(release) !== manifest.version)
    throw new Error('Extract this package into ROOT/releases/VERSION');
  const current = resolve(root, 'current');
  if (existsSync(current) && !lstatSync(current).isSymbolicLink())
    throw new Error('current must be a symbolic link');
  const lock = resolve(root, '.update-lock');
  mkdirSync(lock); // Fail closed if another update, or an interrupted update, holds the lock.
  try {
    const env = readProtectedEnv(resolve(root, 'shared/iam.env'));
    const migrationEnv = readProtectedEnv(resolve(root, 'shared/migration.env'));
    validateAppEnv(env, manifest);
    if (databaseTarget(env) !== databaseTarget(migrationEnv))
      throw new Error('Application and migrator point to different databases');
    if (new URL(env.DATABASE_URL).search !== new URL(migrationEnv.DATABASE_URL).search)
      throw new Error('Use the same TLS parameters for application and migrations');
    if (manifest.provisional && !argv.includes('--allow-provisional'))
      throw new Error(
        'URLs are provisional; rebuild with the confirmed profile or use --allow-provisional for a coordinated test'
      );
    command(process.execPath, [
      resolve(release, 'ops/migrate.mjs'),
      resolve(root, 'shared/migration.env'),
      '--check',
    ]);
    if (argv.includes('--check')) {
      console.log(`Preflight passed: ${manifest.version}. No migration or activation performed.`);
      return;
    }
    const backupReference = argv
      .find((arg) => arg.startsWith('--backup-reference='))
      ?.split('=')[1];
    if (!backupReference)
      throw new Error(
        'Record a verified backup reference, or initial-empty-db for a confirmed empty first installation'
      );
    for (const action of ['stop', 'restart'])
      command('sudo', ['-n', '-l', '/bin/systemctl', action, 'iam']);
    await activate({
      release,
      root,
      version: manifest.version,
      backupReference,
      verify: () => verifyHealth(env.PORT, manifest.version),
    });
  } finally {
    rmdirSync(lock);
  }
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
