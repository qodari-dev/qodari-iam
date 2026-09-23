import test from 'node:test';
import { createRequire } from 'node:module';
import { sign, verify } from 'node:crypto';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { readFileSync, writeFileSync, cpSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';

// Never reads DATABASE_URL or the project's .env. This database must be disposable.
const connectionString = process.env.NATIVE_TEST_DATABASE_URL;
test(
  'packaged migration runner: PG18 fresh install, repeat, failed transaction, runtime smoke',
  { skip: !connectionString, timeout: 180_000 },
  async (t) => {
    const url = new URL(connectionString);
    assert.equal(url.pathname, '/iam_native_test', 'Only the disposable test DB is allowed');
    const release = resolve(process.env.NATIVE_RELEASE);
    const { migrateDatabase } = await import(
      pathToFileURL(resolve(release, 'ops/migrate.mjs')).href
    );
    const folder = resolve(release, 'migrations');
    const journal = JSON.parse(readFileSync(resolve(folder, 'meta/_journal.json'), 'utf8'));
    const env = {
      DATABASE_URL: connectionString,
      EXPECTED_DATABASE: 'iam_native_test',
      EXPECTED_DB_HOST: url.hostname,
    };
    const client = new Client({ connectionString });
    const work = mkdtempSync(resolve(tmpdir(), 'iam-pg18-test-'));
    try {
      await client.connect();
      const existing = await client.query("SELECT to_regclass('public.accounts') AS existing");
      assert.equal(
        existing.rows[0].existing,
        null,
        'Expected a fresh test database; no data is deleted by this test'
      );
      // Execute the shipped role/grant policy, adapting only the disposable DB and password prompts.
      const roleSql = readFileSync(resolve(release, 'templates/database-iam.sql'), 'utf8')
        .replace(
          /CREATE DATABASE iam OWNER iam_migrator;/,
          'ALTER DATABASE iam_native_test OWNER TO iam_migrator;'
        )
        .replace(/^\\(?:connect|set).*$/gm, '')
        .replace(
          /^\\password (\w+)$/gm,
          (_, role) => `ALTER ROLE ${role} PASSWORD 'native-test-only';`
        )
        .replace(/\bDATABASE iam\b/g, 'DATABASE iam_native_test');
      await client.query(roleSql);
      const migratorUrl = new URL(connectionString);
      migratorUrl.username = 'iam_migrator';
      migratorUrl.password = 'native-test-only';
      env.DATABASE_URL = migratorUrl.href;
      const runtimeUrl = new URL(connectionString);
      runtimeUrl.username = 'iam_runtime';
      runtimeUrl.password = 'native-test-only';
      assert.equal(await migrateDatabase(env, folder, { checkOnly: true }), journal.entries.length);
      assert.equal(
        (await client.query("SELECT to_regclass('public.accounts') AS existing")).rows[0].existing,
        null
      );
      await migrateDatabase(env, folder);
      assert.equal(await migrateDatabase(env, folder), 0);
      assert.equal(
        (await client.query('SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations')).rows[0]
          .n,
        journal.entries.length
      );
      const runtimeClient = new Client({ connectionString: runtimeUrl.href });
      await runtimeClient.connect();
      try {
        assert.equal(
          (await runtimeClient.query('SELECT rolsuper FROM pg_roles WHERE rolname = current_user'))
            .rows[0].rolsuper,
          false
        );
        await runtimeClient.query('SELECT count(*) FROM public.accounts');
        await assert.rejects(runtimeClient.query('CREATE TABLE forbidden_runtime_ddl(id int)'), {
          code: '42501',
        });
        await assert.rejects(runtimeClient.query('SELECT * FROM drizzle.__drizzle_migrations'), {
          code: '42501',
        });
      } finally {
        await runtimeClient.end();
      }
      const manifest = JSON.parse(readFileSync(resolve(release, 'release.json'), 'utf8'));
      const appEnv = {
        INSTALLATION: manifest.installation,
        NODE_ENV: 'production',
        APP_ENV: 'prod',
        HOSTNAME: '127.0.0.1',
        PORT: '31847',
        PAUSE_SCHEDULER: '1',
        ...manifest.publicEnv,
        DATABASE_URL: runtimeUrl.href,
        EXPECTED_DATABASE: 'iam_native_test',
        EXPECTED_DB_HOST: url.hostname,
        IAM_ISSUER: manifest.publicEnv.NEXT_PUBLIC_APP_URL,
        IAM_APP_SLUG: 'iam',
        IAM_DEFAULT_ACCOUNT_SLUG: 'native-test',
        RESEND_API_KEY: 'test-only',
        RESEND_MAIL_FROM: 'test@example.invalid',
        DO_SPACES_ENDPOINT: 'https://storage.example.invalid',
        DO_SPACES_REGION: 'test',
        DO_SPACES_BUCKET: 'test',
        DO_SPACES_KEY: 'test-only',
        DO_SPACES_SECRET: 'test-only',
      };
      const config = {
        BOOTSTRAP_ACCOUNT_NAME: 'Native test',
        BOOTSTRAP_ADMIN_EMAIL: 'admin@example.invalid',
        BOOTSTRAP_ADMIN_FIRST_NAME: 'Test',
        BOOTSTRAP_ADMIN_LAST_NAME: 'Admin',
        BOOTSTRAP_ADMIN_PASSWORD: 'test-only-password#with-hash',
        BOOTSTRAP_PLAN_KEY: 'native-test',
        BOOTSTRAP_PLAN_NAME: 'Native test',
        BOOTSTRAP_PLAN_PRICE: '0',
        BOOTSTRAP_MAX_USERS: '10',
        BOOTSTRAP_MAX_APPLICATIONS: '5',
      };
      function writeEnv(name, values) {
        const file = resolve(work, name);
        writeFileSync(
          file,
          Object.entries(values)
            .map(([k, v]) => `${k}="${v}"`)
            .join('\n'),
          { mode: 0o600 }
        );
        return file;
      }
      const envFile = writeEnv('iam.env', appEnv);
      writeEnv('migration.env', env);
      const bootstrapFile = writeEnv('bootstrap.env', config);
      const runBootstrap = (apply = false) =>
        spawnSync(
          process.execPath,
          [
            resolve(release, 'ops/bootstrap.mjs'),
            envFile,
            bootstrapFile,
            ...(apply ? ['--apply'] : []),
          ],
          { encoding: 'utf8', env: { PATH: process.env.PATH } }
        );
      const preview = runBootstrap();
      assert.equal(preview.status, 0, preview.stderr);
      assert.match(preview.stdout, /ready-to-initialize/);
      assert.equal((await client.query('SELECT count(*)::int AS n FROM accounts')).rows[0].n, 0);
      const created = runBootstrap(true);
      assert.equal(created.status, 0, created.stderr);
      assert.doesNotMatch(
        created.stdout + created.stderr,
        /test-only-password|PRIVATE KEY|clientSecret/
      );
      const {
        rows: [admin],
      } = await client.query('SELECT * FROM users');
      const {
        rows: [iamApp],
      } = await client.query('SELECT * FROM applications');
      assert.equal(admin.is_admin, true);
      const requireApp = createRequire(resolve(release, 'app/package.json'));
      const argon2 = requireApp('argon2');
      assert.equal(await argon2.verify(admin.password_hash, config.BOOTSTRAP_ADMIN_PASSWORD), true);
      assert.equal(await argon2.verify(admin.password_hash, 'wrong'), false);
      assert.equal(iamApp.token_alg, 'RS256');
      const payload = Buffer.from('native-signature-probe');
      assert.equal(
        verify(
          'RSA-SHA256',
          payload,
          iamApp.jwt_public_key,
          sign('RSA-SHA256', payload, iamApp.jwt_private_key)
        ),
        true
      );
      const repeat = runBootstrap(true);
      assert.equal(repeat.status, 0, repeat.stderr);
      assert.match(repeat.stdout, /already-initialized/);
      assert.equal(
        (await client.query('SELECT password_hash FROM users')).rows[0].password_hash,
        admin.password_hash
      );
      assert.equal(
        (await client.query('SELECT jwt_private_key FROM applications')).rows[0].jwt_private_key,
        iamApp.jwt_private_key
      );
      const required = JSON.parse(
        readFileSync(resolve(release, 'required-iam-permissions.json'), 'utf8')
      );
      assert.equal(
        (await client.query('SELECT count(*)::int AS n FROM permissions')).rows[0].n,
        required.length
      );
      const {
        rows: [regular],
      } = await client.query(
        "INSERT INTO users (account_id,email,first_name,last_name,password_hash) VALUES ($1,'regular@example.invalid','Regular','User',$2) RETURNING id",
        [admin.account_id, admin.password_hash]
      );
      const permissionList = spawnSync(
        process.execPath,
        [resolve(release, 'ops/list-required-permissions.mjs'), '--json'],
        { encoding: 'utf8' }
      );
      assert.equal(permissionList.status, 0, permissionList.stderr);
      assert.ok(JSON.parse(permissionList.stdout).length > 0);
      await client.query('SELECT pg_advisory_lock(728462, 1)');
      await assert.rejects(migrateDatabase(env, folder), /Another IAM/);
      await client.query('SELECT pg_advisory_unlock(728462, 1)');

      // Prove that a later failing statement does not leave preceding pending SQL applied.
      const broken = resolve(work, 'broken');
      cpSync(folder, broken, { recursive: true });
      const tag = '9999_test_failure';
      const last = journal.entries.at(-1);
      writeFileSync(
        resolve(broken, 'meta/_journal.json'),
        JSON.stringify({
          ...journal,
          entries: [...journal.entries, { ...last, idx: last.idx + 1, when: last.when + 1, tag }],
        })
      );
      writeFileSync(
        resolve(broken, `${tag}.sql`),
        'CREATE TABLE native_atomicity_probe(id int);--> statement-breakpoint\nSELECT * FROM deliberately_missing_native_table;'
      );
      await assert.rejects(migrateDatabase(env, broken));
      const brokenRelease = resolve(work, 'broken-release');
      mkdirSync(resolve(brokenRelease, 'ops'), { recursive: true });
      cpSync(broken, resolve(brokenRelease, 'migrations'), { recursive: true });
      cpSync(resolve(release, 'ops/migrate.mjs'), resolve(brokenRelease, 'ops/migrate.mjs'));
      const migrationFile = resolve(work, 'migration.env');
      writeFileSync(
        migrationFile,
        Object.entries(env)
          .map(([key, value]) => `${key}="${value}"`)
          .join('\n'),
        { mode: 0o600 }
      );
      const failedCli = spawnSync(
        process.execPath,
        [resolve(brokenRelease, 'ops/migrate.mjs'), migrationFile],
        { encoding: 'utf8' }
      );
      assert.equal(failedCli.status, 1);
      assert.match(failedCli.stderr, /42P01/);
      assert.doesNotMatch(
        failedCli.stderr,
        /native-test-only|SELECT \*|deliberately_missing_native_table/
      );
      assert.equal(
        (await client.query("SELECT to_regclass('public.native_atomicity_probe') AS present"))
          .rows[0].present,
        null
      );
      assert.equal(
        (await client.query('SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations')).rows[0]
          .n,
        journal.entries.length
      );

      await t.test(
        'standalone runtime on Linux',
        { skip: process.platform !== 'linux' },
        async () => {
          const child = spawn(process.execPath, [resolve(release, 'ops/start.mjs')], {
            env: {
              PATH: process.env.PATH,
              IAM_ENV_FILE: envFile,
              NEXT_TELEMETRY_DISABLED: '1',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          let logs = '';
          child.stdout.on('data', (chunk) => {
            logs = (logs + chunk).slice(-5000);
          });
          child.stderr.on('data', (chunk) => {
            logs = (logs + chunk).slice(-5000);
          });
          const closed = once(child, 'close');
          try {
            let ready = false;
            for (let attempt = 0; attempt < 45; attempt++) {
              if (child.exitCode !== null) break;
              try {
                const response = await fetch('http://127.0.0.1:31847/api/health', {
                  signal: AbortSignal.timeout(2000),
                  redirect: 'error',
                });
                const health = await response.json();
                if (response.ok && health.status === 'ok' && health.version === manifest.version) {
                  ready = true;
                  break;
                }
              } catch {
                /* wait for startup */
              }
              await sleep(1000);
            }
            assert.ok(ready, `Packaged app did not become ready: ${logs}`);
            async function login(email) {
              const response = await fetch('http://127.0.0.1:31847/api/v1/auth/login', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  accountSlug: appEnv.IAM_DEFAULT_ACCOUNT_SLUG,
                  appSlug: appEnv.IAM_APP_SLUG,
                  email,
                  password: config.BOOTSTRAP_ADMIN_PASSWORD,
                }),
                signal: AbortSignal.timeout(5000),
              });
              assert.equal(response.status, 200, await response.text());
              const cookie = response.headers
                .getSetCookie()
                .find((c) => c.startsWith('qodari_iam_session='));
              assert.ok(cookie);
              assert.match(cookie, /HttpOnly/i);
              assert.match(cookie, /Secure/i);
              return cookie.split(';')[0];
            }
            const adminCookie = await login(config.BOOTSTRAP_ADMIN_EMAIL);
            const regularCookie = await login('regular@example.invalid');
            const readUser = (cookie) =>
              fetch(`http://127.0.0.1:31847/api/v1/users/${admin.id}`, {
                headers: { cookie },
                signal: AbortSignal.timeout(5000),
              });
            assert.equal((await readUser(adminCookie)).status, 200);
            assert.equal((await readUser(regularCookie)).status, 403);
            const {
              rows: [role],
            } = await client.query(
              "INSERT INTO roles (account_id,application_id,name,slug) VALUES ($1,$2,'Readers','readers') RETURNING id",
              [admin.account_id, iamApp.id]
            );
            await client.query(
              "INSERT INTO role_permissions (role_id,permission_id) SELECT $1,id FROM permissions WHERE application_id=$2 AND resource='users' AND action='read'",
              [role.id, iamApp.id]
            );
            await client.query('INSERT INTO user_roles (user_id,role_id) VALUES ($1,$2)', [
              regular.id,
              role.id,
            ]);
            assert.equal((await readUser(regularCookie)).status, 200);
            const jwksResponse = await fetch('http://127.0.0.1:31847/.well-known/jwks.json', {
              signal: AbortSignal.timeout(5000),
            });
            assert.equal(jwksResponse.status, 200);
            const jwks = await jwksResponse.json();
            assert.equal(jwks.keys.length, 1);
            assert.equal(jwks.keys[0].kid, iamApp.jwt_kid);
            assert.equal(jwks.keys[0].d, undefined);
          } finally {
            child.kill('SIGTERM');
            const killTimer = setTimeout(() => child.kill('SIGKILL'), 10_000);
            await closed;
            clearTimeout(killTimer);
          }
        }
      );
    } finally {
      await client.end();
      rmSync(work, { recursive: true, force: true });
    }
  }
);
