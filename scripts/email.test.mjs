import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';
import { createElement } from 'react';
import { render } from '@react-email/render';
import { validateAppEnv, validateEmailEnv } from '../deploy/native/runtime.mjs';

const require = createRequire(import.meta.url);
const iam =
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).name === 'qodari-iam';
const legacy = iam ? 'RESEND_MAIL_FROM' : 'RESEND_FROM_EMAIL';
const publicEnv = iam
  ? {
      NEXT_PUBLIC_APP_URL: 'https://iam.example.com',
      NEXT_PUBLIC_API_URL: 'https://iam.example.com/api/v1',
      NEXT_PUBLIC_STORAGE_URL: 'https://files.example.com',
    }
  : {
      NEXT_PUBLIC_APP_URL: 'https://aurora.example.com',
      NEXT_PUBLIC_IAM_PORTAL_URL: 'https://iam.example.com/portal',
      NEXT_PUBLIC_STORAGE_URL: 'https://files.example.com',
    };
const configuration = {
  ...publicEnv,
  NODE_ENV: 'production',
  APP_ENV: 'prod',
  TENANCY_MODE: 'dedicated',
  INSTALLATION: 'example-production',
  HOSTNAME: '127.0.0.1',
  PORT: '3000',
  DATABASE_URL: 'postgresql://runtime:test-only@localhost/unused',
  EXPECTED_DATABASE: 'unused',
  EXPECTED_DB_HOST: 'localhost',
  ACCESS_TOKEN_NAME: 'access',
  REFRESH_TOKEN_NAME: 'refresh',
  IAM_BASE_URL: 'https://iam.example.com',
  IAM_TOKEN_URL: 'https://iam.example.com/api/v1/auth/token',
  IAM_ISSUER: 'https://iam.example.com',
  IAM_APP_SLUG: 'aurora',
  IAM_SLUG: 'iam',
  IAM_DEFAULT_ACCOUNT_SLUG: 'example',
  IAM_CLIENT_ID: 'test-only',
  IAM_CLIENT_SECRET: 'test-only',
  IAM_M2M_CLIENT_ID: 'test-only',
  IAM_M2M_CLIENT_SECRET: 'test-only',
  SECRETS_ENC_KEY: 'a'.repeat(64),
  SESSION_TOKEN_SECRET: 'b'.repeat(32),
  VOYAGE_API_KEY: 'test-only',
  ANTHROPIC_API_KEY: 'test-only',
  RESEND_API_KEY: 'test-only',
  [legacy]: iam ? 'IAM <sender@example.com>' : 'sender@example.com',
  DO_SPACES_ENDPOINT: 'https://storage.example.com',
  DO_SPACES_REGION: 'test',
  DO_SPACES_BUCKET: 'test',
  DO_SPACES_KEY: 'test-only',
  DO_SPACES_SECRET: 'test-only',
};
const graphConfig = {
  ...configuration,
  RESEND_API_KEY: undefined,
  [legacy]: undefined,
  EMAIL_PROVIDER: 'graph',
  EMAIL_FROM_EMAIL: 'sender@example.com',
  MS_GRAPH_TENANT_ID: '11111111-1111-1111-1111-111111111111',
  MS_GRAPH_CLIENT_ID: '22222222-2222-2222-2222-222222222222',
  MS_GRAPH_CLIENT_SECRET: 'test-only-secret',
};

// Isolated modules: no .env files, no real credentials and no real network calls.
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
    AbortSignal,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
      return imports[name];
    },
    ...globals,
  });
  return exports;
}
function appEnv(config, isServer = true) {
  return load(
    '../src/env.ts',
    {
      '@t3-oss/env-nextjs': {
        createEnv: (opts) =>
          createEnv({
            ...opts,
            isServer,
            onValidationError: (issues) => {
              throw new Error(
                issues
                  .map((i) => i.path?.map((p) => (typeof p === 'object' ? p.key : p)).join('.'))
                  .join(', ')
              );
            },
          }),
      },
      zod: { z },
    },
    { process: { env: config } }
  ).env;
}

test('existing Resend environments still pass app and native validation without new variables', () => {
  assert.equal(appEnv(configuration).EMAIL_PROVIDER, 'resend');
  validateAppEnv(configuration, {
    installation: configuration.INSTALLATION,
    publicEnv,
  });
});
test('Graph passes app/native preflight without Resend and ignores unused Resend placeholders', () => {
  for (const config of [
    graphConfig,
    { ...graphConfig, RESEND_API_KEY: 'CHANGE_ME', [legacy]: 'CHANGE_ME' },
  ]) {
    assert.equal(appEnv(config).EMAIL_PROVIDER, 'graph');
    validateAppEnv(config, { installation: config.INSTALLATION, publicEnv });
  }
});
test('selected provider credentials are required by app and native preflight', () => {
  for (const field of [
    'EMAIL_FROM_EMAIL',
    'MS_GRAPH_TENANT_ID',
    'MS_GRAPH_CLIENT_ID',
    'MS_GRAPH_CLIENT_SECRET',
  ]) {
    for (const value of [undefined, '', ' ', 'CHANGE_ME']) {
      const invalid = { ...graphConfig, [field]: value };
      assert.throws(() => appEnv(invalid), new RegExp(field));
      assert.throws(() => validateEmailEnv(invalid), new RegExp(field));
    }
  }
  const missingResend = { ...configuration, RESEND_API_KEY: undefined };
  assert.throws(() => appEnv(missingResend), /RESEND_API_KEY/);
  assert.throws(() => validateEmailEnv(missingResend), /RESEND_API_KEY/);
});
test('reject unknown providers and non-address Graph senders', () => {
  for (const change of [
    { EMAIL_PROVIDER: 'smtp' },
    { EMAIL_FROM_EMAIL: 'Name <sender@example.com>' },
  ]) {
    assert.throws(() => appEnv({ ...graphConfig, ...change }));
    assert.throws(() => validateEmailEnv({ ...graphConfig, ...change }));
  }
});
test('generic sender overrides legacy sender with Resend', () => {
  const config = {
    ...configuration,
    EMAIL_FROM_EMAIL: 'new@example.com',
    [legacy]: undefined,
  };
  assert.equal(appEnv(config).EMAIL_FROM_EMAIL, 'new@example.com');
  validateEmailEnv(config);
});
test('browser env validation neither requires mail secrets nor allows reading them', () => {
  const env = appEnv(publicEnv, false);
  assert.equal(env.NEXT_PUBLIC_APP_URL, publicEnv.NEXT_PUBLIC_APP_URL);
  assert.throws(() => env.MS_GRAPH_CLIENT_SECRET, /server-side/);
});

function harness(t, status = 202) {
  const requests = [],
    credentials = [],
    scopes = [];
  const imports = {
    'server-only': {},
    '@azure/identity': {
      ClientSecretCredential: class {
        constructor(...args) {
          credentials.push(args);
        }
        async getToken(requestedScopes) {
          scopes.push(requestedScopes);
          return {
            token: 'test-only-token',
            expiresOnTimestamp: Date.now() + 3600000,
          };
        }
      },
    },
    '@microsoft/microsoft-graph-client': require('@microsoft/microsoft-graph-client'),
    '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials': require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'),
    resend: require('resend'),
  };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const target = new URL(url);
    assert.ok(['graph.microsoft.com', 'api.resend.com'].includes(target.hostname));
    requests.push({
      url: String(url),
      options,
      body: JSON.parse(options.body),
    });
    if (status >= 400)
      return Response.json(
        {
          error: {
            code: 'ErrorAccessDenied',
            message: 'sensitive provider message',
          },
          name: 'validation_error',
          message: 'sensitive provider message',
        },
        { status }
      );
    if (target.hostname === 'api.resend.com') return Response.json({ id: 'test-message' });
    return new Response(null, { status });
  });
  return {
    ...load('../src/server/utils/email-client.ts', imports),
    requests,
    credentials,
    scopes,
  };
}
const message = {
  to: ['recipient@example.com', 'second@example.com'],
  subject: 'Prueba',
  html: '<p>Contenido</p>',
  text: 'Contenido',
  fromName: 'Soporte',
  replyTo: 'support@example.com',
  attachments: [
    {
      filename: 'cita.ics',
      content: Buffer.from('BEGIN:VCALENDAR\r\nEND:VCALENDAR'),
      contentType: 'text/calendar; charset=utf-8; method=REQUEST',
    },
  ],
};

test('Resend SDK preserves sender, text/HTML, replyTo and attachment bytes', async (t) => {
  const h = harness(t);
  const send = h.createEmailClient(configuration);
  await send({ ...message, fromName: iam ? undefined : 'Soporte' });
  assert.equal(h.requests.length, 1);
  assert.equal(h.credentials.length, 0);
  const sent = h.requests[0].body;
  assert.equal(sent.from, iam ? configuration[legacy] : `Soporte <${configuration[legacy]}>`);
  assert.equal(sent.reply_to, message.replyTo);
  assert.equal(sent.html, message.html);
  assert.equal(sent.text, message.text);
  assert.equal(sent.attachments[0].content, message.attachments[0].content.toString('base64'));
});
test('Graph SDK sends using app credentials, encodes recipients/attachments and reuses its client', async (t) => {
  const h = harness(t);
  const send = h.createEmailClient(graphConfig);
  await send(message);
  await send({
    ...message,
    to: 'recipient@example.com',
    attachments: undefined,
  });
  assert.equal(h.credentials.length, 1);
  assert.deepEqual(h.credentials[0], [
    graphConfig.MS_GRAPH_TENANT_ID,
    graphConfig.MS_GRAPH_CLIENT_ID,
    graphConfig.MS_GRAPH_CLIENT_SECRET,
  ]);
  assert.deepEqual(Array.from(h.scopes[0]), ['https://graph.microsoft.com/.default']);
  const { url, options, body } = h.requests[0];
  assert.equal(url, 'https://graph.microsoft.com/v1.0/users/sender%40example.com/sendMail');
  assert.equal(new Headers(options.headers).get('authorization'), 'Bearer test-only-token');
  assert.ok(options.signal);
  assert.equal(body.saveToSentItems, true);
  assert.equal(body.message.body.content, message.html);
  assert.equal(body.message.replyTo[0].emailAddress.address, message.replyTo);
  assert.equal(body.message.toRecipients.length, 2);
  assert.equal(
    body.message.attachments[0].contentBytes,
    message.attachments[0].content.toString('base64')
  );
  assert.equal(body.message.attachments[0].contentType, message.attachments[0].contentType);
  assert.equal(h.requests[1].body.message.toRecipients.length, 1);
  assert.equal(h.requests[1].body.message.attachments, undefined);
});
test('Graph failures do not retry POST, switch providers or disclose SDK error bodies', async (t) => {
  for (const status of [403, 429, 503]) {
    const h = harness(t, status);
    await assert.rejects(
      h.createEmailClient(graphConfig)(message),
      (e) => e.provider === 'graph' && e.status === status && !e.message.includes('sensitive')
    );
    assert.equal(h.requests.length, 1);
    assert.match(h.requests[0].url, /graph.microsoft.com/);
    t.mock.restoreAll();
  }
});
test('Resend rejected submissions fail visibly rather than reporting success', async (t) => {
  const h = harness(t, 422);
  await assert.rejects(
    h.createEmailClient(configuration)(message),
    (e) => e.provider === 'resend' && !e.message.includes('sensitive')
  );
});
test('Graph rejects large attachments and combined payload before authentication or submission', async (t) => {
  const h = harness(t);
  const send = h.createEmailClient(graphConfig);
  await assert.rejects(
    send({
      ...message,
      attachments: [{ filename: 'big.pdf', content: Buffer.alloc(3 * 1024 * 1024) }],
    }),
    /3 MiB/
  );
  await assert.rejects(
    send({
      ...message,
      attachments: [1, 2].map((n) => ({
        filename: `${n}.pdf`,
        content: Buffer.alloc(2 * 1024 * 1024),
      })),
    }),
    /4 MiB/
  );
  assert.equal(h.requests.length, 0);
  assert.equal(h.credentials.length, 0);
});
test('existing template wrapper renders React HTML and uses the configured provider', async (t) => {
  const h = harness(t);
  const wrapper = load(
    iam ? '../src/server/utils/emails.ts' : '../src/server/utils/send-email.ts',
    {
      'server-only': {},
      '@/env': { env: graphConfig },
      './email-client': h,
      '@react-email/render': { render },
      './email-template': {},
    }
  );
  const react = createElement('p', null, 'Código de verificación: 123456');
  if (iam)
    await wrapper.sendEmailMessage({
      to: 'recipient@example.com',
      subject: 'Código',
      react,
    });
  else {
    assert.equal(wrapper.getEmailFromAddress(), graphConfig.EMAIL_FROM_EMAIL);
    await wrapper.sendReactEmail({
      to: 'recipient@example.com',
      subject: 'Código',
      react,
    });
    await wrapper.sendEmail({
      to: 'recipient@example.com',
      subject: 'Texto',
      text: '<unsafe>\nlínea',
    });
    assert.match(h.requests[1].body.message.body.content, /&lt;unsafe&gt;<br>/);
  }
  assert.match(h.requests[0].body.message.body.content, /Código de verificación: 123456/);
});
