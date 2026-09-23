import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  readlinkSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { nativeConfig, validatePublicEnv } from './native-config.mjs';
import { auditPackage, renderTemplates } from './package-native.mjs';
import { databaseTarget, readProtectedEnv, validateAppEnv } from '../deploy/native/runtime.mjs';
import { checkHistory, formatMigrationError } from '../deploy/native/migrate.mjs';
import { spawnSync } from 'node:child_process';
import { activate } from '../deploy/native/update.mjs';

const identity = {
  NATIVE_INSTALLATION: 'cafamaz-production',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '1',
};
function temporary(t) {
  const dir = mkdtempSync(resolve(tmpdir(), 'iam-native-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('client packaging needs public configuration only and marks provisional domains', () => {
  const config = nativeConfig(identity);
  assert.equal(config.provisional, true);
  assert.equal(config.publicEnv.NEXT_PUBLIC_APP_URL, 'https://iam.cafamaz.com');
  assert.equal(config.commit, identity.GITHUB_SHA);
  assert.ok(config.version.startsWith('iam-cafamaz-production-'));
  assert.match(config.version, /-123-1$/);
  assert.throws(() => nativeConfig({ ...identity, NATIVE_INSTALLATION: '../../production' }));
  assert.throws(() => nativeConfig({ ...identity, GITHUB_RUN_ID: '1\nBAD=x' }));
});

test('configuration files must be private and are parsed as data, not shell', (t) => {
  const file = resolve(temporary(t), 'runtime.env');
  writeFileSync(file, 'PASSWORD="literal $HOME $(id)"\n', { mode: 0o600 });
  assert.equal(readProtectedEnv(file).PASSWORD, 'literal $HOME $(id)');
  const publicFile = resolve(temporary(t), 'insecure.env');
  writeFileSync(publicFile, 'PASSWORD=test', { mode: 0o644 });
  assert.throws(() => readProtectedEnv(publicFile), /private/);
});

test('database guards reject an unexpected host, DB or routing override without printing secrets', () => {
  const env = {
    DATABASE_URL:
      'postgresql://migrator:TOPSECRET@192.168.1.13:5432/iam_cafamaz?sslmode=verify-full',
    EXPECTED_DATABASE: 'iam_cafamaz',
    EXPECTED_DB_HOST: '192.168.1.13',
  };
  assert.equal(databaseTarget(env), '192.168.1.13:5432/iam_cafamaz');
  for (const change of [
    { EXPECTED_DATABASE: 'other' },
    { EXPECTED_DB_HOST: 'other' },
    { DATABASE_URL: env.DATABASE_URL + '&host=other' },
  ]) {
    assert.throws(
      () => databaseTarget({ ...env, ...change }),
      (error) => !error.message.includes('TOPSECRET')
    );
  }
});

test('runtime rejects another installation or changed build URLs', () => {
  const manifest = nativeConfig(identity);
  const env = {
    NODE_ENV: 'production',
    APP_ENV: 'prod',
    INSTALLATION: 'other-production',
  };
  assert.throws(() => validateAppEnv(env, manifest), /installation/);
  env.INSTALLATION = manifest.installation;
  assert.throws(() => validateAppEnv(env, manifest), /NEXT_PUBLIC_APP_URL/);
});

test('unquoted hashes fail loudly; quoted secrets preserve #, spaces and shell literals', (t) => {
  const file = resolve(temporary(t), 'secrets.env');
  writeFileSync(file, 'SECRET="abc#def $HOME"\n', { mode: 0o600 });
  assert.equal(readProtectedEnv(file).SECRET, 'abc#def $HOME');
  writeFileSync(file, 'SECRET=abc#def\n');
  assert.throws(() => readProtectedEnv(file), /Unquoted #/);
});

test('CLI reports safe validation errors and unwraps SQLSTATE without exposing SQL or secrets', (t) => {
  const file = resolve(temporary(t), 'migration.env');
  writeFileSync(
    file,
    'DATABASE_URL="postgresql://u:DO_NOT_PRINT@localhost/wrong"\nEXPECTED_DATABASE="expected"\nEXPECTED_DB_HOST="localhost"\n',
    { mode: 0o600 }
  );
  const result = spawnSync(
    process.execPath,
    [resolve('deploy/native/migrate.mjs'), file, '--check'],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL does not match/);
  assert.doesNotMatch(result.stderr, /DO_NOT_PRINT/);
  const linkedEntrypoint = resolve(temporary(t), 'migrate.mjs');
  symlinkSync(resolve('deploy/native/migrate.mjs'), linkedEntrypoint);
  const linked = spawnSync(process.execPath, [linkedEntrypoint, file, '--check'], {
    encoding: 'utf8',
  });
  assert.equal(linked.status, 1, 'A symlinked CLI must execute, not silently exit 0');
  assert.match(linked.stderr, /DATABASE_URL does not match/);
  const publicFile = resolve(temporary(t), 'migration.env');
  writeFileSync(publicFile, 'X=y', { mode: 0o644 });
  const insecure = spawnSync(
    process.execPath,
    [resolve('deploy/native/migrate.mjs'), publicFile, '--check'],
    { encoding: 'utf8' }
  );
  assert.match(insecure.stderr, /chmod 600/);
  assert.equal(
    formatMigrationError({
      message: 'SECRET SQL',
      cause: { code: '42P01', message: 'password' },
    }),
    'Migration failed (42P01); no application activation. Check DB logs with the administrator.'
  );
});

test('profiles reject extra environment keys and render a different client without Cafamaz data', (t) => {
  const original = nativeConfig(identity);
  assert.throws(() => validatePublicEnv({ ...original.publicEnv, NODE_OPTIONS: 'bad' }), /exactly/);
  const other = {
    installation: 'other-production',
    publicEnv: {
      NEXT_PUBLIC_APP_URL: 'https://app.other.example',
      NEXT_PUBLIC_API_URL: 'https://app.other.example',
      NEXT_PUBLIC_STORAGE_URL: 'https://files.other.example',
    },
  };
  const directory = temporary(t);
  renderTemplates(other, directory);
  for (const name of [
    'iam.env.example',
    'migration.env.example',
    'database-iam.sql',
    'nginx-iam.conf.example',
  ]) {
    const content = readFileSync(resolve(directory, name), 'utf8');
    assert.doesNotMatch(content, /cafamaz|192\.168\.1\.|@@/i);
  }
  assert.match(
    readFileSync(resolve(directory, 'iam.env.example'), 'utf8'),
    /https:\/\/app.other.example/
  );
  assert.doesNotMatch(readFileSync('deploy/native/INSTALL.md', 'utf8'), /cafamaz|deployment\.md/i);
});

test('migration history permits only a matching prefix and rejects downgrades or edited SQL', () => {
  const files = [
    { folderMillis: 1, hash: 'a' },
    { folderMillis: 2, hash: 'b' },
  ];
  assert.doesNotThrow(() => checkHistory(files, [{ created_at: '1', hash: 'a' }]));
  assert.throws(() => checkHistory(files, [{ created_at: '1', hash: 'changed' }]), /differs/);
  assert.throws(
    () =>
      checkHistory(files.slice(0, 1), [
        { created_at: 1, hash: 'a' },
        { created_at: 2, hash: 'b' },
      ]),
    /newer/
  );
  assert.throws(() => checkHistory([files[0], files[0]], []), /increasing/);
});

test('packaging rejects secrets accidentally traced by Next and external symlinks', (t) => {
  const dir = temporary(t);
  writeFileSync(resolve(dir, 'server.js'), '// app');
  auditPackage(dir);
  writeFileSync(resolve(dir, '.env.local'), 'SECRET=not-for-delivery');
  assert.throws(() => auditPackage(dir), /Forbidden/);
  rmSync(resolve(dir, '.env.local'));
  symlinkSync(tmpdir(), resolve(dir, 'external'));
  assert.throws(() => auditPackage(dir), /escapes/);
});

function fixture(t) {
  const root = temporary(t);
  const old = resolve(root, 'releases/old');
  const release = resolve(root, 'releases/new');
  mkdirSync(old, { recursive: true });
  mkdirSync(release, { recursive: true });
  symlinkSync(old, resolve(root, 'current'));
  return { root, release, old, version: 'new', backupReference: 'test-backup' };
}

test('activation stops before migration, switches only on success, then checks health', async (t) => {
  const context = fixture(t);
  const events = [];
  await activate({
    ...context,
    log: () => {},
    run: async (program, args) => {
      events.push(program === 'sudo' ? args[2] : 'migrate');
      if (program !== 'sudo')
        assert.equal(readlinkSync(resolve(context.root, 'current')), context.old);
    },
    verify: async () => {
      assert.equal(readlinkSync(resolve(context.root, 'current')), context.release);
      events.push('healthy');
    },
  });
  assert.deepEqual(events, ['stop', 'migrate', 'restart', 'healthy']);
});

test('failed migration preserves current and does not restart; failed health stops new app', async (t) => {
  for (const failAt of ['migrate', 'health']) {
    const context = fixture(t);
    const events = [];
    await assert.rejects(
      activate({
        ...context,
        log: () => {},
        run: async (program, args) => {
          const action = program === 'sudo' ? args[2] : 'migrate';
          events.push(action);
          if (action === failAt) throw new Error('Simulated failure');
        },
        verify: async () => {
          throw new Error('Simulated health failure');
        },
      }),
      /No automatic rollback/
    );
    assert.equal(events.at(-1), 'stop');
    assert.equal(
      readlinkSync(resolve(context.root, 'current')),
      failAt === 'migrate' ? context.old : context.release
    );
    if (failAt === 'migrate') assert.ok(!events.includes('restart'));
    assert.equal(
      JSON.parse(
        readFileSync(resolve(context.root, 'deployments.jsonl'), 'utf8').trim().split('\n').at(-1)
      ).phase,
      'failed'
    );
  }
});
