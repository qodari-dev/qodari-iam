import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { createDatabaseReadinessCheck, createHealthResponse, type ReadinessClient } from './health';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class FakeClient extends EventEmitter implements ReadinessClient {
  statements: string[] = [];
  releases: boolean[] = [];

  constructor(private readonly result: () => Promise<unknown> = async () => []) {
    super();
  }

  async query(text: string) {
    this.statements.push(text);
    return this.result();
  }

  release(destroy = false) {
    this.releases.push(destroy);
  }
}

test('readiness runs SELECT 1 and returns a minimal uncached success response', async () => {
  const client = new FakeClient();
  const check = createDatabaseReadinessCheck(async () => client);
  const response = await createHealthResponse(check, 'v1.2.3-cafamaz');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    version: 'v1.2.3-cafamaz',
  });
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  assert.deepEqual(client.statements, ['SELECT 1']);
  assert.deepEqual(client.releases, [false]);
  assert.equal(client.listenerCount('error'), 0);
});

test('failed connection returns 503 without exposing the database error', async () => {
  const check = createDatabaseReadinessCheck(async () => {
    throw new Error('password rejected for postgres://private:secret@db');
  });
  const response = await createHealthResponse(check, 'v1');

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'error', version: 'v1' });
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
});

test('failed queries discard the client and allow the following probe to recover', async () => {
  const broken = new FakeClient(async () => {
    throw new Error('query failed');
  });
  const healthy = new FakeClient();
  let attempts = 0;
  const check = createDatabaseReadinessCheck(async () => (attempts++ === 0 ? broken : healthy));

  assert.equal(await check(), false);
  assert.deepEqual(broken.releases, [true]);
  assert.equal(await check(), true);
  assert.deepEqual(healthy.releases, [false]);
});

test('a hung query times out, returns 503, and discards its connection', async () => {
  const pending = deferred<unknown>();
  const client = new FakeClient(() => pending.promise);
  const check = createDatabaseReadinessCheck(async () => client, 10);
  const response = await createHealthResponse(check, 'v2');

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'error', version: 'v2' });
  assert.deepEqual(client.releases, [true]);
  pending.reject(new Error('late socket error'));
  await Promise.resolve();
  assert.deepEqual(client.releases, [true]);
});

test('a connection arriving after the deadline is discarded without querying', async () => {
  const pending = deferred<ReadinessClient>();
  const client = new FakeClient();
  const check = createDatabaseReadinessCheck(() => pending.promise, 10);

  assert.equal(await check(), false);
  pending.resolve(client);
  await Promise.resolve();
  assert.deepEqual(client.statements, []);
  assert.deepEqual(client.releases, [true]);
});

test('concurrent requests share one probe instead of accumulating connections', async () => {
  const pending = deferred<unknown>();
  const client = new FakeClient(() => pending.promise);
  let connections = 0;
  const check = createDatabaseReadinessCheck(async () => {
    connections++;
    return client;
  });
  const checks = Array.from({ length: 50 }, () => check());

  pending.resolve([]);
  assert.deepEqual(await Promise.all(checks), Array(50).fill(true));
  assert.equal(connections, 1);
  assert.deepEqual(client.statements, ['SELECT 1']);
  assert.deepEqual(client.releases, [false]);
});

test('a client socket error fails the probe and discards its connection', async () => {
  const client = new FakeClient(() => new Promise(() => {}));
  const check = createDatabaseReadinessCheck(async () => client);
  const result = check();
  await Promise.resolve();
  client.emit('error', new Error('connection lost'));

  assert.equal(await result, false);
  assert.deepEqual(client.releases, [true]);
});

test('health defaults to a development version when no release is supplied', async () => {
  assert.deepEqual(await (await createHealthResponse(async () => true)).json(), {
    status: 'ok',
    version: 'development',
  });
});
