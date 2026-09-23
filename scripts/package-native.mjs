import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  lstatSync,
  realpathSync,
  unlinkSync,
} from 'node:fs';
import { resolve, basename, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { nativeConfig } from './native-config.mjs';
import { assertRuntime } from '../deploy/native/runtime.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));

export function auditPackage(directory) {
  const root = realpathSync(directory);
  function visit(folder) {
    for (const name of readdirSync(folder)) {
      const path = resolve(folder, name);
      if (
        /^\.env(?:\.|$)/.test(name) ||
        ['.git', '.npmrc', '.netrc'].includes(name) ||
        /\.(pem|key)$/.test(name)
      )
        throw new Error(
          `Forbidden configuration/credential file in package: ${relative(root, path)}`
        );
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        const target = realpathSync(path);
        if (!target.startsWith(root + sep))
          throw new Error('Package symlink escapes release directory');
      } else if (stat.isDirectory()) visit(path);
    }
  }
  visit(root);
}

export function renderTemplates(config, output) {
  const values = {
    INSTALLATION: config.installation,
    APP_URL: config.publicEnv.NEXT_PUBLIC_APP_URL,
    APP_HOST: new URL(config.publicEnv.NEXT_PUBLIC_APP_URL).hostname,
    API_URL: config.publicEnv.NEXT_PUBLIC_API_URL,
    STORAGE_URL: config.publicEnv.NEXT_PUBLIC_STORAGE_URL,
  };
  mkdirSync(output, { recursive: true });
  const templates = resolve(repo, 'deploy/native/templates');
  for (const file of readdirSync(templates)) {
    const rendered = readFileSync(resolve(templates, file), 'utf8').replace(
      /@@([A-Z_]+)@@/g,
      (_, key) => {
        if (!(key in values)) throw new Error(`Unknown template key: ${key}`);
        return values[key];
      }
    );
    writeFileSync(resolve(output, file), rendered);
  }
}

export async function bundleOperatorTools(release) {
  const ops = resolve(release, 'ops');
  mkdirSync(ops);
  for (const file of ['start.mjs', 'update.mjs', 'runtime.mjs'])
    cpSync(resolve(repo, 'deploy/native', file), resolve(ops, file));
  // Pure JS executable with pg + Drizzle included; no npm/network needed at install time.
  await build({
    entryPoints: [resolve(repo, 'deploy/native/migrate.mjs')],
    outfile: resolve(ops, 'migrate.mjs'),
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    external: ['pg-native'],
    banner: {
      js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
    },
  });
  await build({
    entryPoints: [resolve(repo, 'deploy/native/bootstrap.ts')],
    outfile: resolve(ops, 'bootstrap.mjs'),
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    external: ['pg-native'],
    banner: {
      js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
    },
  });
  const permissionGenerator = resolve(ops, 'generate-permissions.mjs');
  await build({
    entryPoints: [resolve(repo, 'scripts/list-required-permissions.ts')],
    outfile: permissionGenerator,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
  });
  const permissionJson = execFileSync(process.execPath, [permissionGenerator, '--json'], {
    env: { PATH: process.env.PATH, SKIP_ENV_VALIDATION: 'true' },
    encoding: 'utf8',
  });
  const permissions = JSON.parse(permissionJson);
  if (
    !Array.isArray(permissions) ||
    permissions.length === 0 ||
    permissions.some((p) => !p.resource || !p.action)
  )
    throw new Error('Could not generate IAM permissions from the application contract');
  writeFileSync(
    resolve(release, 'required-iam-permissions.json'),
    JSON.stringify(permissions, null, 2) + '\n'
  );
  unlinkSync(permissionGenerator);
  cpSync(
    resolve(repo, 'deploy/native/list-required-permissions.mjs'),
    resolve(ops, 'list-required-permissions.mjs')
  );
}

export async function packageNative(env = process.env) {
  assertRuntime();
  const config = nativeConfig(env);
  for (const [key, value] of Object.entries(config.publicEnv)) {
    if (env[key] !== value) throw new Error(`Build environment differs from profile: ${key}`);
  }
  for (const path of ['.next/standalone/server.js', '.next/static', 'public']) {
    if (!existsSync(resolve(repo, path))) throw new Error(`Missing build output: ${path}`);
  }
  // Packaging is only supported after a clean CI build with public variables.
  if (env.GITHUB_ACTIONS !== 'true')
    throw new Error('Build this release in the clean GitHub packaging workflow');
  const output = resolve(repo, 'dist-native');
  const release = resolve(output, config.version);
  mkdirSync(output, { recursive: true });
  mkdirSync(release);
  cpSync(resolve(repo, '.next/standalone'), resolve(release, 'app'), {
    recursive: true,
    verbatimSymlinks: true,
  });
  cpSync(resolve(repo, '.next/static'), resolve(release, 'app/.next/static'), {
    recursive: true,
  });
  cpSync(resolve(repo, 'public'), resolve(release, 'app/public'), {
    recursive: true,
  });
  const migrations = resolve(repo, 'src/server/db/migrations');
  const journal = JSON.parse(readFileSync(resolve(migrations, 'meta/_journal.json'), 'utf8'));
  mkdirSync(resolve(release, 'migrations/meta'), { recursive: true });
  cpSync(
    resolve(migrations, 'meta/_journal.json'),
    resolve(release, 'migrations/meta/_journal.json')
  );
  for (const entry of journal.entries) {
    if (!/^[a-zA-Z0-9_-]+$/.test(entry.tag)) throw new Error('Invalid migration filename');
    cpSync(
      resolve(migrations, `${entry.tag}.sql`),
      resolve(release, 'migrations', `${entry.tag}.sql`)
    );
  }
  await bundleOperatorTools(release);
  renderTemplates(config, resolve(release, 'templates'));
  cpSync(resolve(repo, 'deploy/native/INSTALL.md'), resolve(release, 'INSTALL.md'));
  const manifest = {
    format: 1,
    application: 'iam',
    ...config,
    builtAt: new Date().toISOString(),
    runtime: {
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      glibc: process.report.getReport().header.glibcVersionRuntime,
    },
    migrations: journal.entries.length,
  };
  writeFileSync(resolve(release, 'release.json'), JSON.stringify(manifest, null, 2) + '\n');
  auditPackage(release);
  const archive = resolve(output, `${config.version}.tar.gz`);
  execFileSync('tar', ['-czf', archive, '-C', output, config.version]);
  const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex');
  writeFileSync(`${archive}.sha256`, `${checksum}  ${basename(archive)}\n`);
  console.log(
    `Created ${basename(archive)} (${manifest.migrations} migrations); SHA-256 ${checksum}`
  );
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  packageNative().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
