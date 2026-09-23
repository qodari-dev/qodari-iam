import { readFileSync, appendFileSync, realpathSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
function validateUrl(value, name, protocols) {
  try {
    if (typeof value !== 'string' || !value || /\s/.test(value)) throw new Error();
    const url = new URL(value);
    if (
      !protocols.includes(url.protocol) ||
      !url.hostname ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new Error();
    return url;
  } catch {
    throw new Error(`Missing or invalid ${name}`);
  }
}

export const PUBLIC_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_STORAGE_URL',
];

export function validatePublicEnv(values) {
  if (
    !values ||
    Object.keys(values).length !== PUBLIC_KEYS.length ||
    Object.keys(values).some((key) => !PUBLIC_KEYS.includes(key))
  )
    throw new Error('Profile publicEnv must contain exactly the three supported public URL keys');
  return values;
}

export function nativeConfig(env) {
  const installation = env.NATIVE_INSTALLATION;
  if (
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-production$/.test(installation ?? '') ||
    installation.length > 44
  )
    throw new Error('Invalid native installation name');
  const profile = JSON.parse(
    readFileSync(new URL(`../deploy/native/profiles/${installation}.json`, import.meta.url))
  );
  if (profile.installation !== installation || typeof profile.provisional !== 'boolean')
    throw new Error('Invalid installation profile');
  validatePublicEnv(profile.publicEnv);
  for (const key of PUBLIC_KEYS) {
    const url = validateUrl(profile.publicEnv[key], key, ['https:']);
    if (
      url.search ||
      (['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_API_URL'].includes(key) && url.pathname !== '/')
    )
      throw new Error(`Invalid ${key}`);
  }
  if (profile.publicEnv.NEXT_PUBLIC_API_URL !== profile.publicEnv.NEXT_PUBLIC_APP_URL)
    throw new Error('Native IAM API URL must equal the app origin, without /api/v1');
  if (
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') ||
    !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? '') ||
    !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT ?? '')
  )
    throw new Error('Missing GitHub release identity');
  return {
    ...profile,
    version: `iam-${installation}-${env.GITHUB_SHA}-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,
    commit: env.GITHUB_SHA,
  };
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  const config = nativeConfig(process.env);
  appendFileSync(
    process.env.GITHUB_ENV,
    Object.entries(config.publicEnv)
      .map(([k, v]) => `${k}=${v}\n`)
      .join('')
  );
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${config.version}\n`);
  console.log(`Packaging ${config.installation}; provisional URLs: ${config.provisional}`);
}
