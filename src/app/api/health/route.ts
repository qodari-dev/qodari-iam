import { Pool } from 'pg';

import { env } from '@/env';
import { createDatabaseReadinessCheck, createHealthResponse } from '@/server/utils/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let pool: Pool | undefined;

const checkDatabase = createDatabaseReadinessCheck(() => {
  pool ??= new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production',
    max: 1,
    connectionTimeoutMillis: 1_000,
    query_timeout: 1_000,
    statement_timeout: 1_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  }).on('error', () => {
    // pg removes broken idle clients; the next probe establishes a new one.
  });
  return pool.connect();
});

export async function GET(): Promise<Response> {
  return createHealthResponse(checkDatabase, env.APP_VERSION);
}
