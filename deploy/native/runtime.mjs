import { readFileSync, statSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';

export class OperatorError extends Error {}

export function assertRuntime() {
  if (
    process.platform !== 'linux' ||
    process.arch !== 'x64' ||
    process.versions.node.split('.')[0] !== '24'
  )
    throw new OperatorError('This release requires Linux x86-64 with Node.js 24');
  if (!process.report.getReport().header.glibcVersionRuntime)
    throw new OperatorError('This release requires glibc (Debian), not Alpine/musl');
}

export function readManifest(release) {
  const manifest = JSON.parse(readFileSync(resolve(release, 'release.json'), 'utf8'));
  if (
    manifest.format !== 1 ||
    manifest.application !== 'iam' ||
    !/^[a-z][a-z0-9-]*-production$/.test(manifest.installation ?? '') ||
    !/^[a-z0-9-]+-[a-f0-9]{40}-[1-9][0-9]*-[1-9][0-9]*$/.test(manifest.version ?? '')
  )
    throw new OperatorError('Invalid IAM release manifest');
  return manifest;
}

/** @returns {Record<string, string>} Parsed dotenv values are always strings. */
export function readProtectedEnv(file) {
  const stat = statSync(file);
  if (!stat.isFile() || (stat.mode & 0o077) !== 0)
    throw new OperatorError('Configuration must be a private file (chmod 600)');
  const source = readFileSync(file, 'utf8');
  const seen = new Set();
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const entry = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!entry || seen.has(entry[1]))
      throw new OperatorError(`Invalid or duplicate configuration entry at line ${index + 1}`);
    seen.add(entry[1]);
    const value = entry[2].trim();
    if (/^["']/.test(value)) {
      if (!/^(".*"|'.*')\s*(?:#.*)?$/.test(value))
        throw new OperatorError(
          `Unclosed quote at configuration line ${index + 1}; use a single-line quoted value`
        );
    } else if (value.includes('#')) {
      throw new OperatorError(
        `Unquoted # at configuration line ${index + 1}; quote the entire value to avoid truncating a secret`
      );
    }
  }
  return parseEnv(source);
}

export function validateAppEnv(env, manifest) {
  if (env.NODE_ENV !== 'production' || env.APP_ENV !== 'prod')
    throw new OperatorError('Expected NODE_ENV=production, APP_ENV=prod');
  if (env.INSTALLATION !== manifest.installation)
    throw new OperatorError('Package and server installation do not match');
  for (const [key, value] of Object.entries(manifest.publicEnv)) {
    if (env[key] !== value)
      throw new OperatorError(
        `${key} differs from the compiled release; rebuild with the correct URLs`
      );
  }
  if (
    env.HOSTNAME !== '127.0.0.1' ||
    !/^\d+$/.test(env.PORT ?? '') ||
    Number(env.PORT) < 1024 ||
    Number(env.PORT) > 65535
  )
    throw new OperatorError('Use HOSTNAME=127.0.0.1 and an unprivileged port behind Nginx');
  for (const key of [
    'DATABASE_URL',
    'IAM_ISSUER',
    'IAM_APP_SLUG',
    'IAM_DEFAULT_ACCOUNT_SLUG',
    'RESEND_API_KEY',
    'RESEND_MAIL_FROM',
    'DO_SPACES_ENDPOINT',
    'DO_SPACES_REGION',
    'DO_SPACES_BUCKET',
    'DO_SPACES_KEY',
    'DO_SPACES_SECRET',
  ]) {
    if (!env[key] || env[key].includes('CHANGE_ME'))
      throw new OperatorError(`Configure ${key} before deploying`);
  }
  for (const key of ['IAM_APP_SLUG', 'IAM_DEFAULT_ACCOUNT_SLUG']) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(env[key])) throw new OperatorError(`Invalid ${key}`);
  }
  databaseTarget(env);
  if (env.SKIP_ENV_VALIDATION)
    throw new OperatorError('SKIP_ENV_VALIDATION must not be set in production');
}

export function databaseTarget(env) {
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new OperatorError('Invalid DATABASE_URL');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password)
    throw new OperatorError('DATABASE_URL must identify a PostgreSQL user and password');
  const database = decodeURIComponent(url.pathname.slice(1));
  if (
    !env.EXPECTED_DATABASE ||
    !env.EXPECTED_DB_HOST ||
    database !== env.EXPECTED_DATABASE ||
    url.hostname !== env.EXPECTED_DB_HOST
  )
    throw new OperatorError('DATABASE_URL does not match EXPECTED_DATABASE and EXPECTED_DB_HOST');
  // Reject alternate routing in the connection string. Match the app and migrator.
  for (const key of url.searchParams.keys()) {
    if (!['sslmode', 'sslrootcert'].includes(key))
      throw new OperatorError('Only sslmode and sslrootcert query parameters are supported');
  }
  return `${url.hostname}:${url.port || '5432'}/${database}`;
}
