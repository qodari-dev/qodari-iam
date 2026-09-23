import { realpathSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readProtectedEnv } from './runtime.mjs';
import { migrateDatabase, formatMigrationError } from './migrate-core.mjs';
export { migrateDatabase, formatMigrationError, checkHistory } from './migrate-core.mjs';

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  const envFile = process.argv[2];
  if (!envFile || ![undefined, '--check'].includes(process.argv[3])) {
    console.error('Usage: node migrate.mjs /absolute/path/migration.env [--check]');
    process.exitCode = 1;
  } else {
    const folder = fileURLToPath(new URL('../migrations/', import.meta.url));
    Promise.resolve()
      .then(() =>
        migrateDatabase(readProtectedEnv(resolve(envFile)), folder, {
          checkOnly: process.argv[3] === '--check',
        })
      )
      .catch((error) => {
        console.error(formatMigrationError(error));
        process.exitCode = 1;
      });
  }
}
