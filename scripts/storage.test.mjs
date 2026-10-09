import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';
import { validateStorageEnv } from '../deploy/native/runtime.mjs';

const require = createRequire(import.meta.url);
const iam =
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).name === 'qodari-iam';
const account = '63d37c3a-ded9-49dd-a954-96abd068e0cc';
const file = '12345678-1234-4123-8123-123456789abc';
const prefix = iam ? `prod/custom-iam/${account}` : `prod/aurora/${account}/branding`;
const type = iam ? 'account-logo' : 'email-logo';
const publicKey = `${prefix}/${type}/${file}.png`;
const origin = iam ? 'https://iam.example.com' : 'https://aurora.example.com';
const base = {
  NODE_ENV: 'production',
  APP_ENV: 'prod',
  IAM_APP_SLUG: 'custom-iam',
  DO_SPACES_ENDPOINT: 'https://s3.example.com',
  DO_SPACES_REGION: 'garage',
  DO_SPACES_BUCKET: 'test.files',
  DO_SPACES_KEY: 'test-only-key',
  DO_SPACES_SECRET: 'test-only-secret',
  NEXT_PUBLIC_APP_URL: origin,
  NEXT_PUBLIC_STORAGE_URL: 'https://cdn.example.com',
};
const proxy = {
  ...base,
  STORAGE_PUBLIC_DELIVERY: 'proxy',
  DO_SPACES_FORCE_PATH_STYLE: 'true',
  AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED',
  NEXT_PUBLIC_STORAGE_URL: `${origin}/api/public-assets`,
};

// Transpile isolated modules: no .env, production credentials, network or database.
function load(path, imports, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    Buffer,
    URL,
    Response,
    Headers,
    Request,
    AbortSignal,
    TransformStream,
    ReadableStream,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), `Unexpected import ${name}`);
      return imports[name];
    },
    ...globals,
  });
  return exports;
}
const uploadTypes = load('../src/lib/upload.ts', {});
function policy(config = proxy) {
  return load('../src/server/utils/public-asset-policy.ts', {
    'server-only': {},
    '@/env': { env: config },
    '@/lib/upload': uploadTypes,
  });
}
function storage(config = base, overrides = {}) {
  return load('../src/server/utils/spaces.ts', {
    'server-only': {},
    '@/env': { env: config },
    './storage-paths': { isManagedStorageKey: () => true },
    '@aws-sdk/client-s3': { ...require('@aws-sdk/client-s3'), ...overrides },
    '@aws-sdk/s3-request-presigner': require('@aws-sdk/s3-request-presigner'),
  });
}
function clientEnv(config) {
  // Validate only the storage fields through the actual app schema.
  return load(
    '../src/env.ts',
    {
      zod: { z },
      '@t3-oss/env-nextjs': {
        createEnv(opts) {
          const keys = [
            'STORAGE_PUBLIC_DELIVERY',
            'DO_SPACES_FORCE_PATH_STYLE',
            'AWS_REQUEST_CHECKSUM_CALCULATION',
            'EMAIL_PROVIDER',
            'EMAIL_FROM_EMAIL',
            'RESEND_API_KEY',
            iam ? 'RESEND_MAIL_FROM' : 'RESEND_FROM_EMAIL',
          ];
          const server = Object.fromEntries(keys.map((key) => [key, opts.server[key]]));
          return createEnv({
            ...opts,
            server,
            client: {
              NEXT_PUBLIC_APP_URL: opts.client.NEXT_PUBLIC_APP_URL,
              NEXT_PUBLIC_STORAGE_URL: opts.client.NEXT_PUBLIC_STORAGE_URL,
            },
            isServer: true,
            onValidationError: () => {
              throw new Error('Invalid configuration');
            },
          });
        },
      },
    },
    {
      process: {
        env: {
          ...config,
          EMAIL_PROVIDER: 'resend',
          RESEND_API_KEY: 'test-only',
          [iam ? 'RESEND_MAIL_FROM' : 'RESEND_FROM_EMAIL']: 'sender@example.com',
        },
      },
    }
  ).env;
}
function asset(content = 'image', extra = {}, onCancel = () => {}) {
  const bytes = new TextEncoder().encode(content);
  return {
    ContentLength: bytes.length,
    ContentType: 'image/png',
    ETag: '"asset-version"',
    Body: {
      transformToWebStream: () =>
        new ReadableStream({
          start(c) {
            c.enqueue(bytes);
            c.close();
          },
          cancel: onCancel,
        }),
    },
    ...extra,
  };
}
function server(read, config = proxy) {
  return load('../src/server/utils/public-assets.ts', {
    'server-only': {},
    '@/env': { env: config },
    './public-asset-policy': policy(config),
    './spaces': { readPublicAssetObject: read },
  }).servePublicAsset;
}
const request = (init = {}) => new Request(`${origin}/api/public-assets/${publicKey}`, init);

test('existing direct/CDN configuration remains the default; invalid proxy combinations fail app and native validation', () => {
  assert.equal(clientEnv(base).STORAGE_PUBLIC_DELIVERY, 'direct');
  assert.equal(clientEnv(proxy).STORAGE_PUBLIC_DELIVERY, 'proxy');
  validateStorageEnv(base);
  validateStorageEnv(proxy);
  for (const config of [
    { ...base, STORAGE_PUBLIC_DELIVERY: 'bad' },
    { ...base, STORAGE_PUBLIC_DELIVERY: 'proxy' },
    { ...proxy, STORAGE_PUBLIC_DELIVERY: 'direct' },
    { ...base, DO_SPACES_FORCE_PATH_STYLE: 'yes' },
    { ...base, AWS_REQUEST_CHECKSUM_CALCULATION: 'never' },
  ]) {
    assert.throws(() => clientEnv(config));
    assert.throws(() => validateStorageEnv(config));
  }
});

test('Spaces keeps public-read and public CDN URLs without configuring new variables', async () => {
  const s = storage();
  const url = new URL(
    await (iam ? s.generatePresignedUploadUrl : s.generatePublicPresignedUploadUrl)(
      publicKey,
      'image/png'
    )
  );
  assert.equal(url.searchParams.get('x-amz-acl'), 'public-read');
  assert.equal(s.publicUploadHeaders('image/png')['x-amz-acl'], 'public-read');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
  const resolver = load('../src/utils/storage.ts', { '@/env': { env: base } });
  assert.equal(resolver.getStorageUrl(publicKey), `https://cdn.example.com/${publicKey}`);
});

test('proxy uploads use the same private bucket, omit ACL, and do not sign an empty-body checksum', async () => {
  const s = storage(proxy);
  const url = new URL(
    await (iam ? s.generatePresignedUploadUrl : s.generatePublicPresignedUploadUrl)(
      publicKey,
      'image/png'
    )
  );
  assert.equal(url.hostname, 's3.example.com');
  assert.equal(url.pathname, `/test.files/${publicKey}`);
  assert.equal(url.searchParams.get('x-amz-acl'), null);
  assert.equal(
    [...url.searchParams.keys()].some((k) => k.toLowerCase().startsWith('x-amz-checksum')),
    false
  );
  assert.deepEqual({ ...s.publicUploadHeaders('image/png') }, { 'Content-Type': 'image/png' });
  const resolver = load('../src/utils/storage.ts', { '@/env': { env: proxy } });
  assert.equal(resolver.getStorageUrl(publicKey), `${origin}/api/public-assets/${publicKey}`);
  assert.equal(
    resolver.getStorageUrl('https://legacy.example.com/logo.png'),
    'https://legacy.example.com/logo.png'
  );
  if (!iam) {
    const privateKey = `prod/aurora/${account}/knowledge/uploads/${file}-document.pdf`;
    const put = new URL(await s.generatePresignedUploadUrl(privateKey, 'application/pdf'));
    const get = new URL(await s.generatePresignedDownloadUrl(privateKey));
    assert.equal(put.searchParams.get('x-amz-acl'), null);
    assert.equal(get.pathname, `/test.files/${privateKey}`);
    assert.ok(get.searchParams.get('X-Amz-Signature'));
  }
});

test('public policy only accepts generated keys for declared public types and the current application/environment', () => {
  const p = policy().publicAssetPolicy;
  assert.equal(p(publicKey)?.contentType, 'image/png');
  assert.equal(p(publicKey.replace('.png', '.svg'))?.contentType, 'image/svg+xml');
  for (const key of [
    publicKey.replace('prod/', 'dev/'),
    publicKey.replace(account, 'arbitrary-account'),
    publicKey.replace(type, 'private'),
    publicKey.replace(`${file}.png`, 'secret.png'),
    publicKey + '/extra.png',
    publicKey + '?x=1',
    publicKey + '#x',
    publicKey.replace('.png', '.html'),
    publicKey.replace('.png', '.pdf'),
    publicKey.replace(`/${type}/`, '/../'),
    publicKey.replace(`/${type}/`, '/%2e%2e/'),
    publicKey.replace(`/${type}/`, '/%252e%252e/'),
    publicKey.replace(`/${type}/`, '/..\\/'),
    publicKey.replace('/prod/', '//prod/'),
    `prod/aurora/${account}/certificates/assets/signature/${file}.png`,
    `prod/aurora/${account}/tickets/secret/attachments/${file}.png`,
    `prod/aurora/${account}/knowledge/uploads/${file}.png`,
    `prod/aurora/${account}/whatsapp/${file}.png`,
    `prod/aurora/${account}/deliveries/${file}.pdf`,
    `prod/another-app/${account}/${type}/${file}.png`,
  ].filter((k) => k !== publicKey))
    assert.equal(p(key), null, key);
  if (!iam) {
    assert.equal(p(`${prefix}/store-menu/${file}.pdf`)?.contentType, 'application/pdf');
    assert.equal(p(`${prefix}/store-menu/${file}.svg`), null);
    assert.equal(p(`${prefix}/whatsapp-template-image/${file}.webp`), null);
  }
});

test('disabled proxy and private keys return 404 before making any storage request', async () => {
  let calls = 0;
  const read = async () => {
    calls++;
    return asset();
  };
  assert.equal((await server(read, base)(request(), publicKey)).status, 404);
  assert.equal(
    (await server(read)(request(), `prod/aurora/${account}/documents/${file}.pdf`)).status,
    404
  );
  assert.equal(calls, 0);
});

test('GET streams a public asset with short cache and a sandbox against same-origin SVG/script execution', async () => {
  const serve = server(async (key, head, signal) => {
    assert.equal(key, publicKey);
    assert.equal(head, false);
    assert.ok(signal instanceof AbortSignal);
    return asset('public bytes');
  });
  const response = await serve(request(), publicKey);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'public bytes');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300');
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'none'; sandbox");
  const svg = await server(async () => asset('<svg/>', { ContentType: 'image/svg+xml' }))(
    request(),
    publicKey.replace('.png', '.svg')
  );
  assert.equal(svg.status, 200);
  await svg.text();
  assert.equal(svg.headers.get('Content-Security-Policy').includes('sandbox'), true);
});

test('HEAD uses object metadata only and ETag revalidation returns an empty 304', async () => {
  const serve = server(async (_key, head) => {
    assert.equal(head, true);
    return asset('', { Body: undefined, ContentLength: 12 });
  });
  const head = await serve(request({ method: 'HEAD' }), publicKey);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('Content-Length'), '12');
  const cached = await server(async () => asset())(
    request({ headers: { 'If-None-Match': 'W/"asset-version"' } }),
    publicKey
  );
  assert.equal(cached.status, 304);
  assert.equal(await cached.text(), '');
  assert.equal(cached.headers.get('Content-Length'), null);
});

test('oversized or unexpected content is not published and storage failures do not disclose details', async () => {
  for (const extra of [
    { ContentType: 'text/html' },
    { ContentLength: 30_000_000 },
    { ContentLength: undefined },
    { ContentLength: 0 },
  ]) {
    const response = await server(async () => asset('x', extra))(request(), publicKey);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  for (const code of [404, 403, 500]) {
    const response = await server(async () => {
      throw { message: 'private secret bucket SQL error', $metadata: { httpStatusCode: code } };
    })(request(), publicKey);
    assert.equal(response.status, code === 404 ? 404 : 502);
    assert.equal(await response.text(), '');
  }
});

test('stream aborts if actual bytes exceed the advertised size', async () => {
  const response = await server(async () => asset('too many bytes', { ContentLength: 2 }))(
    request(),
    publicKey
  );
  await assert.rejects(() => response.text(), /Invalid asset size/);
});

test('storage reads and deletes still target the configured single bucket', async () => {
  const commands = [];
  class S3Client {
    async send(command) {
      commands.push(command);
      return { ContentLength: 1 };
    }
  }
  const s = storage(proxy, { S3Client });
  await s.readPublicAssetObject(publicKey, false, new AbortController().signal);
  await s.readPublicAssetObject(publicKey, true, new AbortController().signal);
  await s.deleteObject(publicKey);
  assert.deepEqual(
    commands.map((c) => c.constructor.name),
    ['GetObjectCommand', 'HeadObjectCommand', 'DeleteObjectCommand']
  );
  for (const c of commands) {
    assert.equal(c.input.Bucket, base.DO_SPACES_BUCKET);
    assert.equal(c.input.Key, publicKey);
  }
});
