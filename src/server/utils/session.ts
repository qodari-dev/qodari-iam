import { db } from '@/server/db';
import { cookies } from 'next/headers';
import { sessions } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { parse } from 'cookie';
import { argon2i, hash } from 'argon2';

export const SESSION_COOKIE_NAME = 'qodari_iam_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function createSession(opts: { userId: string; accountId: string; req: Request }) {
  const { userId, accountId, req } = opts;

  const ipHeader = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
  const ipAddress = ipHeader?.split(',')[0]?.trim();
  const userAgent = req.headers.get('user-agent') ?? undefined;

  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      accountId,
      ipAddress,
      userAgent,
      expiresAt,
    })
    .returning();

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: session.id,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });

  return { session };
}

export async function getSessionFromRequest(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? '';
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  const sessionId = cookies[SESSION_COOKIE_NAME];
  if (!sessionId) return null;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) return null;
  if (session.expiresAt && session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return session;
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) return null;
  if (session.expiresAt && session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return session;
}

export async function hashToken(token: string): Promise<string> {
  return await hash(token, {
    type: argon2i,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}
