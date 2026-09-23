export type ReadinessClient = {
  query(text: string): Promise<unknown>;
  release(destroy?: boolean): void;
  once(event: 'error', listener: (error: Error) => void): unknown;
  removeListener(event: 'error', listener: (error: Error) => void): unknown;
};

/**
 * Share one in-flight probe so concurrent health requests cannot queue an
 * unbounded number of connections. A failed/timed-out client is discarded,
 * including a connection that arrives after the request deadline.
 */
export function createDatabaseReadinessCheck(
  connect: () => Promise<ReadinessClient>,
  timeoutMs = 2_500
): () => Promise<boolean> {
  let inFlight: Promise<boolean> | null = null;

  async function probe(): Promise<boolean> {
    let client: ReadinessClient | undefined;
    let timedOut = false;
    let failed = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rejectFailure: (error: Error) => void = () => {};
    const failure = new Promise<never>((_, reject) => {
      rejectFailure = reject;
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error('Readiness deadline exceeded'));
      }, timeoutMs);
    });
    const onError = (error: Error) => rejectFailure(error);

    const query = async () => {
      const connected = await connect();
      if (timedOut) {
        connected.release(true);
        return;
      }
      client = connected;
      client.once('error', onError);
      await client.query('SELECT 1');
    };

    try {
      await Promise.race([query(), failure]);
      failed = false;
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
      if (client) {
        client.removeListener('error', onError);
        client.release(failed);
      }
    }
  }

  return () => {
    inFlight ??= probe().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

export async function createHealthResponse(
  checkDatabase: () => Promise<boolean>,
  version = 'development'
): Promise<Response> {
  let ready = false;
  try {
    ready = await checkDatabase();
  } catch {
    // Public readiness reports state only, never connection strings or errors.
  }

  return Response.json(
    { status: ready ? 'ok' : 'error', version },
    {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}
