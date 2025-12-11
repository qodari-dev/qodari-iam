import { db } from '@/server/db';
import { rateLimits } from '@/server/db/schema';
import { sql } from 'drizzle-orm';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
};

export type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const now = new Date();
  const windowStartBoundary = new Date(now.getTime() - config.windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({
      key: config.key,
      windowStart: now,
      count: 1,
    })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        windowStart: sql`
          CASE 
            WHEN ${rateLimits.windowStart} < ${windowStartBoundary}
            THEN ${now}
            ELSE ${rateLimits.windowStart}
          END
        `,
        count: sql`
          CASE 
            WHEN ${rateLimits.windowStart} < ${windowStartBoundary}
            THEN 1
            ELSE ${rateLimits.count} + 1
          END
        `,
      },
    })
    .returning({
      windowStart: rateLimits.windowStart,
      count: rateLimits.count,
    });

  if (!row) {
    const resetAt = new Date(now.getTime() + config.windowMs);
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      resetAt,
    };
  }

  const used = row.count;
  const success = used <= config.limit;
  const remaining = success ? config.limit - used : 0;
  const resetAt = new Date(row.windowStart.getTime() + config.windowMs);

  return {
    success,
    limit: config.limit,
    remaining,
    resetAt,
  };
}
