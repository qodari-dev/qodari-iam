import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { assertRuntime, readManifest, readProtectedEnv, validateAppEnv } from './runtime.mjs';

assertRuntime();
const release = fileURLToPath(new URL('../', import.meta.url));
const manifest = readManifest(release);
const env = readProtectedEnv(process.env.IAM_ENV_FILE || '/srv/iam/shared/iam.env');
validateAppEnv(env, manifest);
Object.assign(process.env, env, { APP_VERSION: manifest.version });
delete process.env.SKIP_ENV_VALIDATION;
process.chdir(resolve(release, 'app'));
await import(pathToFileURL(resolve(release, 'app/server.js')).href);
