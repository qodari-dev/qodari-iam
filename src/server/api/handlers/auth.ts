import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import { env } from '@/env';
import {
  ForgotPasswordResponse,
  LoginResponse,
  OauthTokenResponse,
  ResetPasswordResponse,
} from '@/schemas/auth';
import { db } from '@/server/db';
import {
  accountMembers,
  Application,
  applications,
  authorizationCodes,
  refreshTokens,
  sessions,
  users,
} from '@/server/db/schema';
import { getAuthContextFromRequest } from '@/server/utils/auth-context';
import { sendPasswordResetEmail } from '@/server/utils/emails';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { signAccessToken } from '@/server/utils/jwt';
import { hashPassword, verifyPassword } from '@/server/utils/password';
import { checkRateLimit } from '@/server/utils/rate-limit';
import {
  clearSessionCookie,
  createSession,
  getSessionFromRequest,
  hashToken,
} from '@/server/utils/session';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, gt } from 'drizzle-orm';
import { contract } from '../contracts';
import { getUserRolesAndPermissions } from '@/server/utils/get-user-roles-and-permissions';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function validateClientAuth(app: Application, clientSecret?: string) {
  if (app.clientType === 'public') return true;
  if (!clientSecret) return false;

  const expected = Buffer.from(app.clientSecret);
  const provided = Buffer.from(clientSecret);

  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export const auth = tsr.router(contract.auth, {
  // --------------------------------------
  // POST - /login
  // --------------------------------------
  login: async ({ body }, { request, nextRequest }) => {
    try {
      const { email, password } = body;

      // ----- RATE LIMIT por IP + email -----
      const ip = getClientIp(nextRequest);

      const emailKey = `login:email:${email.toLowerCase()}`;
      const ipKey = `login:ip:${ip}`;

      const windowMs = 5 * 60 * 1000; // 5 min

      const [emailRl, ipRl] = await Promise.all([
        checkRateLimit({
          key: emailKey,
          limit: 3,
          windowMs,
        }),
        checkRateLimit({
          key: ipKey,
          limit: 20,
          windowMs,
        }),
      ]);

      if (!emailRl.success || !ipRl.success) {
        return {
          status: 429,
          body: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          headers: {
            'X-RateLimit-Limit': String(emailRl.limit),
            'X-RateLimit-Remaining': String(emailRl.remaining),
            'X-RateLimit-Reset': emailRl.resetAt.toISOString(),
          },
        };
      }

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        return {
          status: 401,
          body: { message: `Invalid credentials` },
        };
      }

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) {
        return {
          status: 401,
          body: { message: `Invalid credentials` },
        };
      }

      const memberships = await db.query.accountMembers.findMany({
        where: eq(accountMembers.userId, user.id),
        with: {
          account: true,
        },
      });

      const accountsList = memberships.map((m) => ({
        id: m.account.id,
        name: m.account.name,
        slug: m.account.slug,
        status: m.account.status,
      }));

      if (accountsList.length === 0) {
        return {
          status: 400,
          body: { message: 'User has no associated accounts' },
        };
      }

      const currentAccountId = accountsList[0]?.id;

      const response: LoginResponse = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
          status: user.status,
        },
        accounts: accountsList,
        currentAccountId,
      };

      await createSession({
        userId: user.id,
        accountId: currentAccountId,
        req: request,
      });

      return {
        status: 200,
        body: response,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Something went wrong querying applications.',
        logPrefix: '[auth.login]',
      });
    }
  },
  // --------------------------------------
  // GET - /me
  // --------------------------------------
  me: async ({ query }, { request }) => {
    try {
      const ctx = await getAuthContextFromRequest(request, {
        accountIdOverride: query?.accountId,
        appSlug: query?.appSlug,
      });
      const { session: _, ...body } = ctx;
      return { status: 200, body };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Something went wrong querying applications.',
        logPrefix: '[auth.me]',
      });
    }
  },
  // --------------------------------------
  // POST - /logout
  // --------------------------------------
  logout: async ({}, { request }) => {
    try {
      const session = await getSessionFromRequest(request);

      if (session) {
        await db.delete(sessions).where(eq(sessions.id, session.id));
      }

      await clearSessionCookie();

      return {
        status: 204,
        body: undefined,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Something went wrong querying applications.',
        logPrefix: '[auth.logout]',
      });
    }
  }, // --------------------------------------
  // POST - /oauthToken
  // --------------------------------------
  oauthToken: async ({ body }, { nextRequest }) => {
    try {
      // ----- RATE LIMIT por IP + email -----
      const ip = getClientIp(nextRequest);

      const ipKey = `oauthToken:ip:${ip}`;

      const windowMs = 5 * 60 * 1000; // 5 min

      const ipRl = await checkRateLimit({
        key: ipKey,
        limit: 5,
        windowMs,
      });

      if (!ipRl.success) {
        return {
          status: 429,
          body: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          headers: {
            'X-RateLimit-Limit': String(ipRl.limit),
            'X-RateLimit-Remaining': String(ipRl.remaining),
            'X-RateLimit-Reset': ipRl.resetAt.toISOString(),
          },
        };
      }
      if (body.grant_type === 'authorization_code') {
        const { code, client_id, client_secret, redirect_uri, code_verifier } = body;

        // 1) app
        const app = await db.query.applications.findFirst({
          where: eq(applications.clientId, client_id),
        });
        if (!app || app.status !== 'active') {
          return {
            status: 401,
            body: { message: 'Invalid client', code: 'invalid_client' },
          };
        }

        // 2) Validar client_secret si la app es confidential
        if (!validateClientAuth(app, client_secret)) {
          return {
            status: 401,
            body: {
              message: 'Invalid client credentials',
              code: 'invalid_client',
            },
          };
        }

        // 3) auth code
        const authCode = await db.query.authorizationCodes.findFirst({
          where: eq(authorizationCodes.code, code),
        });

        if (!authCode) {
          return {
            status: 400,
            body: {
              message: 'Invalid authorization code',
              code: 'invalid_grant',
            },
          };
        }

        const now = new Date();
        if (authCode.applicationId !== app.id || authCode.used || authCode.expiresAt < now) {
          return {
            status: 400,
            body: {
              message: 'Invalid or expired authorization code',
              code: 'invalid_grant',
            },
          };
        }

        if (redirect_uri && authCode.redirectUri) {
          if (redirect_uri !== authCode.redirectUri) {
            return {
              status: 400,
              body: {
                message: 'Invalid redirect_uri',
                code: 'invalid_request',
              },
            };
          }
        }

        // 4) PKCE
        if (app.clientType === 'public' && !authCode.codeChallenge) {
          return {
            status: 400,
            body: {
              message: 'PKCE is required for public clients',
              code: 'invalid_request',
            },
          };
        }
        if (authCode.codeChallenge && authCode.codeChallengeMethod === 'S256') {
          if (!code_verifier) {
            return {
              status: 400,
              body: {
                message: 'code_verifier is required for PKCE',
                code: 'invalid_request',
              },
            };
          }
          const hash = createHash('sha256').update(code_verifier).digest('base64url');

          if (hash !== authCode.codeChallenge) {
            return {
              status: 400,
              body: { message: 'Invalid code_verifier', code: 'invalid_grant' },
            };
          }
        }

        // 5) Marcar auth code como usado
        await db
          .update(authorizationCodes)
          .set({ used: true, usedAt: now })
          .where(eq(authorizationCodes.id, authCode.id));

        // 6) Access token
        const { roles, permissions } = await getUserRolesAndPermissions({
          userId: authCode.userId,
          accountId: authCode.accountId,
          applicationId: authCode.applicationId,
        });
        const accessToken = await signAccessToken({
          payload: {
            sub: authCode.userId,
            accountId: authCode.accountId,
            appId: authCode.applicationId,
            roles,
            permissions,
          },
          expiresInSec: app.accessTokenExp,
          issuer: env.IAM_ISSUER,
          audience: app.clientId,
          jwtSecret: app.clientJwtSecret,
        });

        // 7) Refresh + familyId
        const familyId = randomUUID();
        const rawRefreshToken = randomUUID();
        const refreshTokenHash = await hashToken(rawRefreshToken);
        const refreshExpiresAt = new Date(Date.now() + app.refreshTokenExp * 1000);

        await db.insert(refreshTokens).values({
          familyId,
          userId: authCode.userId,
          accountId: authCode.accountId,
          applicationId: authCode.applicationId,
          tokenHash: refreshTokenHash,
          expiresAt: refreshExpiresAt,
          revoked: false,
        });

        const response: OauthTokenResponse = {
          accessToken,
          refreshToken: rawRefreshToken,
          tokenType: 'Bearer',
          expiresIn: app.accessTokenExp,
          scope: authCode.scope ?? '',
        };

        return { status: 200, body: response };
      } else if (body.grant_type === 'refresh_token') {
        const { refresh_token, client_id, client_secret } = body;

        // 1) app
        const app = await db.query.applications.findFirst({
          where: eq(applications.clientId, client_id),
        });
        if (!app || app.status !== 'active') {
          return {
            status: 401,
            body: { message: 'Invalid client', code: 'invalid_client' },
          };
        }

        if (!validateClientAuth(app, client_secret)) {
          return {
            status: 401,
            body: {
              message: 'Invalid client credentials',
              code: 'invalid_client',
            },
          };
        }

        // 2) Buscar RT por hash + app
        const hashed = await hashToken(refresh_token);

        const existingRefresh = await db.query.refreshTokens.findFirst({
          where: and(eq(refreshTokens.tokenHash, hashed), eq(refreshTokens.applicationId, app.id)),
        });

        if (!existingRefresh) {
          return {
            status: 401,
            body: { message: 'Invalid refresh token', code: 'invalid_grant' },
          };
        }

        const now = new Date();

        // 3) Si ya está revocado => reuse detection
        if (existingRefresh.revoked) {
          // revoca toda la familia por seguridad
          await db
            .update(refreshTokens)
            .set({
              revoked: true,
              revokedAt: now,
              revokedReason: 'REUSE_DETECTED',
            })
            .where(eq(refreshTokens.familyId, existingRefresh.familyId));

          return {
            status: 401,
            body: {
              message: 'Refresh token reuse detected',
              code: 'invalid_grant',
            },
          };
        }

        if (existingRefresh.expiresAt && existingRefresh.expiresAt < now) {
          return {
            status: 401,
            body: { message: 'Expired refresh token', code: 'invalid_grant' },
          };
        }

        // 4) Rotar refresh token
        const newRawRefreshToken = randomUUID();
        const newRefreshHash = await hashToken(newRawRefreshToken);
        const newRefreshExpiresAt = new Date(Date.now() + app.refreshTokenExp * 1000);

        await db.transaction(async (tx) => {
          // Primero marcar como usado
          // marcar viejo como ROTATED
          await tx
            .update(refreshTokens)
            .set({ revoked: true, revokedAt: now, revokedReason: 'ROTATED', lastUsedAt: now })
            .where(eq(refreshTokens.id, existingRefresh.id));

          // Luego insertar el nuevo
          // nuevo token, misma familia
          await tx.insert(refreshTokens).values({
            familyId: existingRefresh.familyId,
            userId: existingRefresh.userId,
            accountId: existingRefresh.accountId,
            applicationId: existingRefresh.applicationId,
            tokenHash: newRefreshHash,
            expiresAt: newRefreshExpiresAt,
            revoked: false,
          });
        });

        // 5) nuevo access token
        const { roles, permissions } = await getUserRolesAndPermissions({
          userId: existingRefresh.userId,
          accountId: existingRefresh.accountId,
          applicationId: existingRefresh.applicationId,
        });
        const accessToken = await signAccessToken({
          payload: {
            sub: existingRefresh.userId,
            accountId: existingRefresh.accountId,
            appId: existingRefresh.applicationId,
            roles,
            permissions,
          },
          expiresInSec: app.accessTokenExp,
          issuer: env.IAM_ISSUER,
          audience: app.clientId,
          jwtSecret: app.clientJwtSecret,
        });

        const response: OauthTokenResponse = {
          accessToken,
          refreshToken: newRawRefreshToken,
          tokenType: 'Bearer',
          expiresIn: app.accessTokenExp,
        };

        return { status: 200, body: response };
      }

      return {
        status: 400,
        body: { message: 'Unsupported grant_type' },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Something went wrong querying applications.',
        logPrefix: '[auth.oauthToken]',
      });
    }
  },
  forgotPassword: async ({ body }, { nextRequest }) => {
    try {
      const { email } = body;

      // ----- RATE LIMIT por IP + email -----
      const ip = getClientIp(nextRequest);

      const emailKey = `forgot:email:${email.toLowerCase()}`;
      const ipKey = `forgot:ip:${ip}`;

      const windowMs = 15 * 60 * 1000; // 15 min

      const [emailRl, ipRl] = await Promise.all([
        checkRateLimit({
          key: emailKey,
          limit: 3,
          windowMs,
        }),
        checkRateLimit({
          key: ipKey,
          limit: 20,
          windowMs,
        }),
      ]);

      if (!emailRl.success || !ipRl.success) {
        return {
          status: 429,
          body: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          headers: {
            'X-RateLimit-Limit': String(emailRl.limit),
            'X-RateLimit-Remaining': String(emailRl.remaining),
            'X-RateLimit-Reset': emailRl.resetAt.toISOString(),
          },
        };
      }

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        return {
          status: 200,
          body: {
            message:
              'If an account with that email exists, we have sent instructions to reset your password.',
          } satisfies ForgotPasswordResponse,
        };
      }

      const rawToken = randomUUID();
      const tokenHash = await hashToken(rawToken);
      const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await db
        .update(users)
        .set({
          passwordResetToken: tokenHash,
          passwordResetExpires: expires,
        })
        .where(eq(users.id, user.id));

      const baseUrl = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const resetUrl = new URL('/auth/reset-password', baseUrl);
      resetUrl.searchParams.set('token', rawToken);

      await sendPasswordResetEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`,
        resetUrl: resetUrl.toString(),
      });

      return {
        status: 200,
        body: {
          message:
            'If an account with that email exists, we have sent instructions to reset your password.',
        } satisfies ForgotPasswordResponse,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Failed to request password reset.',
        logPrefix: '[auth.forgotPassword]',
      });
    }
  },
  resetPassword: async ({ body }, { nextRequest }) => {
    try {
      // ----- RATE LIMIT por IP + email -----
      const ip = getClientIp(nextRequest);

      const ipKey = `resetPassword:ip:${ip}`;

      const windowMs = 15 * 60 * 1000; // 15 min

      const ipRl = await checkRateLimit({
        key: ipKey,
        limit: 20,
        windowMs,
      });

      if (!ipRl.success) {
        return {
          status: 429,
          body: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          headers: {
            'X-RateLimit-Limit': String(ipRl.limit),
            'X-RateLimit-Remaining': String(ipRl.remaining),
            'X-RateLimit-Reset': ipRl.resetAt.toISOString(),
          },
        };
      }
      const { token, password } = body;

      const tokenHash = await hashToken(token);
      const now = new Date();

      const user = await db.query.users.findFirst({
        where: and(eq(users.passwordResetToken, tokenHash), gt(users.passwordResetExpires, now)),
      });

      if (!user || !user.passwordResetExpires || user.passwordResetExpires < now) {
        return {
          status: 400,
          body: {
            message: 'Invalid or expired reset token',
            code: 'INVALID_TOKEN',
          },
        };
      }

      const newPasswordHash = await hashPassword(password);

      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        })
        .where(eq(users.id, user.id));

      await db.delete(sessions).where(eq(sessions.userId, user.id));
      await db
        .update(refreshTokens)
        .set({
          revoked: true,
          revokedReason: 'PASSWORD_RESET',
          revokedAt: now,
        })
        .where(eq(refreshTokens.userId, user.id));

      const bodyResponse: ResetPasswordResponse = {
        message: 'Password reset successfully. You can now log in.',
      };

      return {
        status: 200,
        body: bodyResponse,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Failed to reset password.',
        logPrefix: '[auth.resetPassword]',
      });
    }
  },
  changePassword: async ({ body: { currentPassword, newPassword } }, { request }) => {
    try {
      const session = await getSessionFromRequest(request);
      if (!session) {
        return { status: 401, body: { message: 'No autenticado' } };
      }

      const rate = await checkRateLimit({
        key: `change-password:${session.userId}`,
        limit: 5,
        windowMs: 60 * 60 * 1000,
      });

      if (!rate.success) {
        return {
          status: 429,
          body: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          headers: {
            'X-RateLimit-Limit': String(rate.limit),
            'X-RateLimit-Remaining': String(rate.remaining),
            'X-RateLimit-Reset': rate.resetAt.toISOString(),
          },
        };
      }

      const [user] = await db.select().from(users).where(eq(users.id, session.userId));

      if (!user || !user.passwordHash) {
        throw new Error('Invalid User');
      }

      const match = await verifyPassword(currentPassword, user.passwordHash);
      if (!match) {
        throw new Error('Check Data');
      }

      const newHash = await hashPassword(newPassword);

      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, session.userId));

      return { status: 204, body: undefined };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Failed to change password.',
        logPrefix: '[auth.resetPassword]',
      });
    }
  },
});
