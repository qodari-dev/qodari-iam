import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createSecureContext, TLSSocket } from 'node:tls';
import { Client } from 'pg';
import { postgresConfig } from './postgres-config.mjs';

function certificate(directory, name, san) {
  const config = join(directory, `${name}.cnf`);
  const cert = join(directory, `${name}.crt`);
  const key = join(directory, `${name}.key`);
  writeFileSync(
    config,
    `[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ext\n[dn]\nCN=pg-tls-test\n[ext]\nsubjectAltName=${san}\n`,
    { mode: 0o600 }
  );
  execFileSync(
    process.env.OPENSSL_BIN || 'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-config',
      config,
      '-keyout',
      key,
      '-out',
      cert,
    ],
    { stdio: 'ignore' }
  );
  return { cert, key };
}

async function tlsPostgres(t, san) {
  const directory = mkdtempSync(join(tmpdir(), 'pg-config-tls-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const { cert, key } = certificate(directory, 'server', san);
  const context = createSecureContext({
    key: readFileSync(key),
    cert: readFileSync(cert),
  });
  const sockets = new Set();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.once('data', (request) => {
      // PostgreSQL SSLRequest -> 'S' -> TLS. Authentication is simulated only
      // after a verified TLS handshake; no real database or credentials are used.
      if (request.length !== 8 || request.readInt32BE(4) !== 80877103) {
        socket.destroy();
        return;
      }
      socket.write('S');
      const secure = new TLSSocket(socket, {
        isServer: true,
        secureContext: context,
      });
      secure.on('error', () => {});
      secure.once('data', () => {
        // AuthenticationOk, then ReadyForQuery with idle transaction status.
        secure.write(Buffer.from([82, 0, 0, 0, 8, 0, 0, 0, 0, 90, 0, 0, 0, 5, 73]));
      });
    });
  });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  return {
    cert,
    directory,
    url(host = '127.0.0.1', ca = cert) {
      const url = new URL(`postgresql://test:test@${host}:${port}/test`);
      url.searchParams.set('sslmode', 'verify-full');
      url.searchParams.set('sslrootcert', ca);
      return url.href;
    },
  };
}

async function connect(config) {
  const client = new Client({ ...config, connectionTimeoutMillis: 3_000 });
  try {
    await client.connect();
    assert.equal(client.connection.stream.authorized, true);
  } finally {
    await client.end();
  }
}

test('pg configuration preserves defaults, credentials, ports and URL TLS settings', () => {
  const url =
    'postgresql://operator:p%23ss%40word@db.example.test:5433/aurora?application_name=check';
  const config = postgresConfig(url, true);
  assert.equal(config.user, 'operator');
  assert.equal(config.password, 'p#ss@word');
  assert.equal(config.port, 5433);
  assert.equal(config.database, 'aurora');
  assert.equal(config.application_name, 'check');
  assert.equal(config.ssl, true);
  assert.equal(config.connectionString, undefined);
  assert.equal(postgresConfig(url, false).ssl, false);
  assert.equal(postgresConfig(url).ssl, undefined);
  assert.deepEqual(postgresConfig(undefined, true), {
    connectionString: undefined,
    ssl: true,
  });
  const local = 'postgresql://test:test@127.0.0.1/test';
  assert.equal(postgresConfig(`${local}?sslmode=disable`, true).ssl, false);
  assert.equal(postgresConfig(local, true).ssl.host, '127.0.0.1');
});

test(
  'IP-only certificate: preserve CA and verify the database IP instead of localhost',
  { timeout: 15_000 },
  async (t) => {
    const server = await tlsPostgres(t, 'IP:127.0.0.1');
    const config = postgresConfig(server.url(), true);
    assert.equal(config.ssl.ca, readFileSync(server.cert, 'utf8'));
    assert.equal(config.ssl.host, '127.0.0.1');
    assert.equal(config.ssl.servername, undefined, 'Do not send an IP address as TLS SNI');
    assert.notEqual(config.ssl.rejectUnauthorized, false);
    await connect(config);
  }
);

test(
  'verify-full still rejects a trusted certificate with the wrong IP',
  { timeout: 15_000 },
  async (t) => {
    const server = await tlsPostgres(t, 'IP:127.0.0.2');
    await assert.rejects(connect(postgresConfig(server.url(), true)), {
      code: 'ERR_TLS_CERT_ALTNAME_INVALID',
      host: '127.0.0.1',
    });
  }
);

test(
  'verify-full still rejects an untrusted certificate even when its IP matches',
  { timeout: 15_000 },
  async (t) => {
    const server = await tlsPostgres(t, 'IP:127.0.0.1');
    const other = certificate(server.directory, 'untrusted', 'IP:127.0.0.1');
    await assert.rejects(
      connect(postgresConfig(server.url('127.0.0.1', other.cert), true)),
      (error) => {
        assert.ok(
          [
            'DEPTH_ZERO_SELF_SIGNED_CERT',
            'SELF_SIGNED_CERT_IN_CHAIN',
            'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
          ].includes(error.code),
          error.code
        );
        return true;
      }
    );
  }
);

test(
  "DNS certificates continue to validate with pg's normal servername handling",
  { timeout: 15_000 },
  async (t) => {
    const server = await tlsPostgres(t, 'DNS:localhost');
    const config = postgresConfig(server.url('localhost'), true);
    assert.equal(config.ssl.host, undefined);
    await connect(config);
  }
);
