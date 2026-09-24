import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { OperatorError, databaseTarget } from './runtime.mjs';
import { postgresConfig } from '../../src/server/db/postgres-config.mjs';

export function checkHistory(files, rows) {
  if (rows.length > files.length) throw new OperatorError('Database is newer than this release');
  for (let i = 0; i < rows.length; i++) {
    if (Number(rows[i].created_at) !== files[i].folderMillis || rows[i].hash !== files[i].hash)
      throw new OperatorError(
        'Migration history differs from this release; investigate before updating'
      );
  }
  for (let i = 1; i < files.length; i++) {
    if (files[i].folderMillis <= files[i - 1].folderMillis)
      throw new OperatorError('Migration timestamps must be strictly increasing');
  }
}

export async function migrateDatabase(env, folder, { checkOnly = false } = {}) {
  databaseTarget(env);
  const files = readMigrationFiles({ migrationsFolder: folder });
  const client = new Client({
    ...postgresConfig(env.DATABASE_URL, true),
    connectionTimeoutMillis: 10_000,
    application_name: 'iam-release-migrator',
  });
  try {
    await client.connect();
    const {
      rows: [lock],
    } = await client.query('SELECT pg_try_advisory_lock(728462, 1) AS acquired');
    if (!lock.acquired) throw new OperatorError('Another IAM migration is running');
    await client.query("SET lock_timeout = '15s'");
    await client.query("SET statement_timeout = '15min'");
    const {
      rows: [server],
    } = await client.query("SELECT current_setting('server_version_num')::int AS version");
    if (server.version < 180000 || server.version >= 190000)
      throw new OperatorError('This installation is validated for PostgreSQL 18');
    const {
      rows: [table],
    } = await client.query("SELECT to_regclass('drizzle.__drizzle_migrations') AS present");
    const rows = table.present
      ? (
          await client.query(
            'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id'
          )
        ).rows
      : [];
    checkHistory(files, rows);
    const pending = files.length - rows.length;
    console.log(`Migration preflight: ${pending} pending of ${files.length}`);
    if (!checkOnly) await migrate(drizzle(client), { migrationsFolder: folder });
    return pending;
  } finally {
    // Closing the session also releases the advisory lock, including on failure.
    await client.end();
  }
}

export function formatMigrationError(error) {
  if (error instanceof OperatorError) return `Migration stopped: ${error.message}`;
  let cause = error;
  for (let i = 0; cause && i < 5; i++, cause = cause.cause) {
    if (typeof cause.code === 'string' && /^[A-Z0-9_]{2,32}$/.test(cause.code))
      return `Migration failed (${cause.code}); no application activation. Check DB logs with the administrator.`;
  }
  return 'Migration failed; no application activation. Check DB logs with the administrator.';
}
