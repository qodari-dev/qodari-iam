import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { accounts, applications, permissions, plans, users } from '../../src/server/db/schema';
import { generateAppKeys } from '../../src/server/utils/app-keys';
import {
  databaseTarget,
  OperatorError,
  readManifest,
  readProtectedEnv,
  validateAppEnv,
} from './runtime.mjs';
import { formatMigrationError, migrateDatabase } from './migrate-core.mjs';

const nonPlaceholder = z
  .string()
  .min(1)
  .refine((v) => !v.includes('CHANGE_ME'));
const configSchema = z.object({
  BOOTSTRAP_ACCOUNT_NAME: nonPlaceholder,
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().max(255),
  BOOTSTRAP_ADMIN_FIRST_NAME: nonPlaceholder.pipe(z.string().max(45)),
  BOOTSTRAP_ADMIN_LAST_NAME: nonPlaceholder.pipe(z.string().max(45)),
  BOOTSTRAP_ADMIN_PASSWORD: nonPlaceholder.pipe(z.string().min(16).max(256)),
  BOOTSTRAP_PLAN_KEY: z.string().regex(/^[a-z0-9-]{1,45}$/),
  BOOTSTRAP_PLAN_NAME: nonPlaceholder,
  BOOTSTRAP_PLAN_PRICE: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/),
  BOOTSTRAP_MAX_USERS: z.coerce.number().int().min(1).max(2147483647),
  BOOTSTRAP_MAX_APPLICATIONS: z.coerce.number().int().min(2).max(2147483647),
});
const permissionSchema = z
  .array(
    z.object({
      resource: z.string().regex(/^[a-zA-Z0-9_-]{1,45}$/),
      action: z.string().regex(/^[a-zA-Z0-9_-]{1,45}$/),
    })
  )
  .min(1);

export async function bootstrap(
  env: Record<string, string>,
  input: Record<string, string>,
  permissionInput: unknown,
  { apply = false } = {}
) {
  databaseTarget(env);
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) {
    throw new OperatorError(
      `Review bootstrap fields: ${[...new Set(parsed.error.issues.map((i) => i.path[0]))].join(', ')}`
    );
  }
  const config = parsed.data;
  const required = permissionSchema.parse(permissionInput);
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: true,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    return await drizzle(client).transaction(async (tx) => {
      // Serialize first-account creation, including ordinary inserts into accounts.
      await tx.execute(sql`SET LOCAL lock_timeout = '15s'`);
      await tx.execute(sql`LOCK TABLE accounts IN SHARE ROW EXCLUSIVE MODE`);
      const existing = await tx.select({ id: accounts.id, slug: accounts.slug }).from(accounts);
      if (existing.length) {
        if (existing.length !== 1 || existing[0].slug !== env.IAM_DEFAULT_ACCOUNT_SLUG)
          throw new OperatorError(
            'Bootstrap is only for a new dedicated IAM database; existing accounts differ'
          );
        // Never reset a password, rotate keys, elevate a user or replace existing configuration.
        return { state: 'already-initialized', accountId: existing[0].id };
      }
      if (!apply) return { state: 'ready-to-initialize' };
      const existingPlan = await tx
        .select({ id: plans.id })
        .from(plans)
        .where(eq(plans.key, config.BOOTSTRAP_PLAN_KEY));
      if (existingPlan.length)
        throw new OperatorError(
          'Plan key already exists; review the existing database before initialization'
        );
      const requireApp = createRequire(new URL('../app/package.json', import.meta.url));
      const argon2: typeof import('argon2') = requireApp('argon2');
      const passwordHash = await argon2.hash(config.BOOTSTRAP_ADMIN_PASSWORD);
      const [plan] = await tx
        .insert(plans)
        .values({
          name: config.BOOTSTRAP_PLAN_NAME,
          key: config.BOOTSTRAP_PLAN_KEY,
          price: config.BOOTSTRAP_PLAN_PRICE,
          maxUsers: config.BOOTSTRAP_MAX_USERS,
          maxApplications: config.BOOTSTRAP_MAX_APPLICATIONS,
        })
        .returning({ id: plans.id });
      const [account] = await tx
        .insert(accounts)
        .values({
          name: config.BOOTSTRAP_ACCOUNT_NAME,
          slug: env.IAM_DEFAULT_ACCOUNT_SLUG,
          planId: plan.id,
          email: config.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
        })
        .returning({ id: accounts.id });
      const [app] = await tx
        .insert(applications)
        .values({
          accountId: account.id,
          name: 'IAM',
          slug: env.IAM_APP_SLUG,
          clientType: 'confidential',
          clientId: randomBytes(24).toString('hex'),
          clientSecret: randomBytes(32).toString('hex'),
          clientJwtSecret: randomBytes(32).toString('hex'),
          tokenAlg: 'RS256',
          ...generateAppKeys(),
          homeUrl: new URL(`/${env.IAM_DEFAULT_ACCOUNT_SLUG}/admin`, env.NEXT_PUBLIC_APP_URL).href,
        })
        .returning({ id: applications.id });
      await tx.insert(permissions).values(
        required.map(({ resource, action }) => ({
          accountId: account.id,
          applicationId: app.id,
          resource,
          action,
          name: `${resource}:${action}`.slice(0, 45),
        }))
      );
      const [admin] = await tx
        .insert(users)
        .values({
          accountId: account.id,
          email: config.BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
          firstName: config.BOOTSTRAP_ADMIN_FIRST_NAME,
          lastName: config.BOOTSTRAP_ADMIN_LAST_NAME,
          passwordHash,
          isAdmin: true,
          isEmployee: true,
        })
        .returning({ id: users.id });
      return {
        state: 'initialized',
        accountId: account.id,
        iamApplicationId: app.id,
        adminId: admin.id,
        permissions: required.length,
      };
    });
  } finally {
    await client.end();
  }
}

async function main(argv: string[]) {
  if (![2, 3].includes(argv.length) || (argv[2] && argv[2] !== '--apply'))
    throw new OperatorError(
      'Usage: node ops/bootstrap.mjs /absolute/path/iam.env /absolute/path/bootstrap.env [--apply]'
    );
  const release = fileURLToPath(new URL('../', import.meta.url));
  const env = readProtectedEnv(resolve(argv[0]));
  validateAppEnv(env, readManifest(release));
  // Require the full matching schema before writing. Supply the migrator env separately
  // only to this preflight; account initialization itself runs with the app's DML role.
  const migrationEnv = readProtectedEnv(resolve(argv[0], '../migration.env'));
  if (
    databaseTarget(env) !== databaseTarget(migrationEnv) ||
    new URL(env.DATABASE_URL).search !== new URL(migrationEnv.DATABASE_URL).search
  )
    throw new OperatorError(
      'Application and migrator must use the same database and TLS parameters'
    );
  if (await migrateDatabase(migrationEnv, resolve(release, 'migrations'), { checkOnly: true }))
    throw new OperatorError('Apply all packaged migrations before initializing IAM');
  const required = JSON.parse(
    readFileSync(resolve(release, 'required-iam-permissions.json'), 'utf8')
  );
  const result = await bootstrap(env, readProtectedEnv(resolve(argv[1])), required, {
    apply: argv[2] === '--apply',
  });
  console.log(JSON.stringify(result)); // IDs/state only; passwords and signing keys never leave the DB.
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof OperatorError ? error.message : formatMigrationError(error));
    process.exitCode = 1;
  });
}
