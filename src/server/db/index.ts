import { env } from '@/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { postgresConfig } from './postgres-config.mjs';
import * as schema from './schema';

export const db = drizzle({
  schema,
  connection: postgresConfig(env.DATABASE_URL, env.NODE_ENV === 'production'),
  logger: env.NODE_ENV === 'development',
});
