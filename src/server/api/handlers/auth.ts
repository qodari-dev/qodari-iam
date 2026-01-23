import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import { env } from '@/env';
import {
  BrandingResponse,
  ForgotPasswordResponse,
  LoginResponse,
  MfaResendResponse,
  MfaVerifyResponse,
  OauthTokenResponse,
  ResetPasswordResponse,
} from '@/schemas/auth';
import { db } from '@/server/db';
import {
  accounts,
  apiClients,
  Application,
  applications,
  authorizationCodes,
  mfaPending,
  refreshTokens,
  sessions,
  users,
} from '@/server/db/schema';
import { getAuthContextFromRequest } from '@/server/utils/auth-context';
import { sendMfaCodeEmail, sendPasswordResetEmail } from '@/server/utils/emails';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { getClientIp } from '@/server/utils/get-client-ip';
import { logAudit } from '@/server/utils/audit-logger';
import { signAccessToken } from '@/server/utils/jwt';
import {
  generateMfaCode,
  getMfaExpiryDate,
  hashMfaCode,
  maskEmail,
  MFA_CONFIG,
  verifyMfaCode,
} from '@/server/utils/mfa';
import { hashPassword, verifyPassword } from '@/server/utils/password';
import { checkRateLimit } from '@/server/utils/rate-limit';
import {
  clearSessionCookie,
  createSession,
  getSessionFromRequest,
  hashToken,
  hashResetToken,
} from '@/server/utils/session';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, gt } from 'drizzle-orm';
import { contract } from '../contracts';
import { getApiClientRolesAndPermissions } from '@/server/utils/get-api-client-roles-and-permissions';
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
      const { email, password, appSlug, accountSlug } = body;

      // ----- RATE LIMIT por IP + email -----
      const ip = getClientIp(nextRequest);

      const emailKey = `login:email:${email.toLowerCase()}`;
      const ipKey = `login:ip:${ip}`;

      const windowMs = 5 * 60 * 1000; // 5 min

      const [emailRl, ipRl] = await Promise.all([
        checkRateLimit({
          key: emailKey,
          limit: 5,
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

      const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.slug, accountSlug), eq(accounts.status, 'active')),
      });

      if (!account) {
        return {
          status: 401,
          body: { message: `Invalid account` },
        };
      }

      const application = await db.query.applications.findFirst({
        where: and(
          eq(applications.accountId, account.id),
          eq(applications.slug, appSlug),
          eq(applications.status, 'active')
        ),
      });

      if (!application) {
        return {
          status: 401,
          body: { message: `Invalid application` },
        };
      }

      const user = await db.query.users.findFirst({
        where: and(
          eq(users.accountId, account.id),
          eq(users.email, email),
          eq(users.status, 'active')
        ),
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

      const currentAccountId = user.accountId;

      // Check if MFA is enabled for this application
      if (application.mfaEnabled) {
        // Generate MFA code
        const mfaCode = generateMfaCode();
        const codeHash = hashMfaCode(mfaCode);
        const expiresAt = getMfaExpiryDate();
        const userAgent = nextRequest?.headers.get('user-agent') ?? null;

        // Create MFA pending record
        const [mfaRecord] = await db
          .insert(mfaPending)
          .values({
            userId: user.id,
            accountId: currentAccountId,
            applicationId: application.id,
            codeHash,
            ipAddress: ip,
            userAgent,
            expiresAt,
          })
          .returning({ id: mfaPending.id });

        // Send MFA code email
        await sendMfaCodeEmail({
          to: user.email,
          name: `${user.firstName} ${user.lastName}`,
          code: mfaCode,
          expiresInMinutes: MFA_CONFIG.EXPIRY_MINUTES,
        });

        const response: LoginResponse = {
          mfaRequired: true,
          mfaToken: mfaRecord.id,
          maskedEmail: maskEmail(user.email),
        };

        return {
          status: 200,
          body: response,
        };
      }

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
        accountId: currentAccountId,
      };

      const { session } = await createSession({
        userId: user.id,
        accountId: currentAccountId,
        req: request,
      });

      logAudit(
        {
          type: 'user',
          session,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
            status: user.status,
          },
          accountId: currentAccountId,
        },
        {
          action: 'login',
          actionKey: 'login',
          resource: 'users',
          resourceId: user.id,
          resourceLabel: `${user.firstName} ${user.lastName}`,
          status: 'success',
          ipAddress: ip,
          userAgent: nextRequest.headers.get('user-agent'),
        }
      );
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
  logout: async ({}, { request, nextRequest }) => {
    try {
      const session = await getSessionFromRequest(request);
      const ipAddress = getClientIp(nextRequest);
      const userAgent = nextRequest.headers.get('user-agent');

      if (session) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, session.userId),
        });

        if (user) {
          logAudit(
            {
              type: 'user',
              session,
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                isAdmin: user.isAdmin,
                status: user.status,
              },
              accountId: session.accountId,
            },
            {
              action: 'logout',
              actionKey: 'logout',
              resource: 'users',
              resourceId: user.id,
              resourceLabel: `${user.firstName} ${user.lastName}`,
              status: 'success',
              ipAddress,
              userAgent,
            }
          );
        }
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
      } else if (body.grant_type === 'client_credentials') {
        // ========================================
        // CLIENT CREDENTIALS FLOW (M2M)
        // ========================================
        const { client_id, client_secret, app_slug } = body;

        // 1) Find API Client by client_id
        const apiClient = await db.query.apiClients.findFirst({
          where: eq(apiClients.clientId, client_id),
          with: {
            account: true,
          },
        });

        if (!apiClient) {
          return {
            status: 401,
            body: { message: 'Invalid client credentials', code: 'invalid_client' },
          };
        }

        // 2) Check if API Client is active
        if (apiClient.status !== 'active') {
          return {
            status: 401,
            body: { message: 'API Client is suspended', code: 'invalid_client' },
          };
        }

        // 3) Verify client_secret (Argon2)
        const isValidSecret = await verifyPassword(client_secret, apiClient.clientSecretHash);
        if (!isValidSecret) {
          return {
            status: 401,
            body: { message: 'Invalid client credentials', code: 'invalid_client' },
          };
        }

        // 4) Find the application by slug within the same account
        const app = await db.query.applications.findFirst({
          where: and(
            eq(applications.accountId, apiClient.accountId),
            eq(applications.slug, app_slug),
            eq(applications.status, 'active')
          ),
        });

        if (!app) {
          return {
            status: 400,
            body: { message: 'Invalid application', code: 'invalid_request' },
          };
        }

        // 5) Get roles and permissions for this API Client for the requested application
        const { permissions } = await getApiClientRolesAndPermissions({
          apiClientId: apiClient.id,
          applicationId: app.id,
        });

        // 6) If the API Client has no roles for this app, deny access
        if (permissions.length === 0) {
          return {
            status: 403,
            body: {
              message: 'API Client has no permissions for this application',
              code: 'access_denied',
            },
          };
        }

        // 7) Generate access token
        const accessToken = await signAccessToken({
          payload: {
            sub: apiClient.id,
            accountId: apiClient.accountId,
            appId: app.id,
            permissions,
            grantType: 'client_credentials',
          },
          expiresInSec: apiClient.accessTokenExp,
          issuer: env.IAM_ISSUER,
          audience: app.clientId,
          jwtSecret: app.clientJwtSecret,
        });

        // 8) Update lastUsedAt
        await db
          .update(apiClients)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiClients.id, apiClient.id));

        // 9) Return token (NO refresh token for client_credentials)
        const response: OauthTokenResponse = {
          accessToken,
          tokenType: 'Bearer',
          expiresIn: apiClient.accessTokenExp,
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
      const { email, accountSlug } = body;

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

      const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.slug, accountSlug), eq(accounts.status, 'active')),
      });

      if (!account) {
        return {
          status: 200,
          body: {
            message:
              'If an account with that email exists, we have sent instructions to reset your password.',
          } satisfies ForgotPasswordResponse,
        };
      }

      const user = await db.query.users.findFirst({
        where: and(
          eq(users.accountId, account.id),
          eq(users.email, email),
          eq(users.status, 'active')
        ),
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
      const tokenHash = hashResetToken(rawToken);
      const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await db
        .update(users)
        .set({
          passwordResetToken: tokenHash,
          passwordResetExpires: expires,
        })
        .where(eq(users.id, user.id));

      const baseUrl = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const resetUrl = new URL(`/${accountSlug}/reset-password`, baseUrl);
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
      const { token, password, accountSlug } = body;

      const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.slug, accountSlug), eq(accounts.status, 'active')),
      });

      if (!account) {
        return {
          status: 400,
          body: {
            message: 'Invalid Account',
            code: 'INVALID_ACCOUNT',
          },
        };
      }

      const tokenHash = hashResetToken(token);
      const now = new Date();

      const user = await db.query.users.findFirst({
        where: and(
          eq(users.accountId, account.id),
          eq(users.passwordResetToken, tokenHash),
          gt(users.passwordResetExpires, now)
        ),
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
  // --------------------------------------
  // POST - /revoke (RFC 7009)
  // --------------------------------------
  revoke: async ({ body }, { nextRequest }) => {
    try {
      const { token, client_id, client_secret } = body;

      // 1. Rate limit por IP
      const ip = getClientIp(nextRequest);
      const ipKey = `revoke:ip:${ip}`;
      const windowMs = 5 * 60 * 1000; // 5 min

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

      // 2. Buscar app por client_id
      const app = await db.query.applications.findFirst({
        where: eq(applications.clientId, client_id),
      });

      if (!app || app.status !== 'active') {
        return {
          status: 401,
          body: { message: 'Invalid client', code: 'invalid_client' },
        };
      }

      // 3. Validar client_secret si la app es confidential
      if (!validateClientAuth(app, client_secret)) {
        return {
          status: 401,
          body: {
            message: 'Invalid client credentials',
            code: 'invalid_client',
          },
        };
      }

      // 4. Hashear token y buscar en refreshTokens
      const hashed = await hashToken(token);
      const existingRefresh = await db.query.refreshTokens.findFirst({
        where: and(eq(refreshTokens.tokenHash, hashed), eq(refreshTokens.applicationId, app.id)),
      });

      // 5. Si existe y no está revocado, revocar token y toda su familia
      // RFC 7009: Siempre retornar 200, no revelar si el token existía
      if (existingRefresh && !existingRefresh.revoked) {
        const now = new Date();
        await db
          .update(refreshTokens)
          .set({
            revoked: true,
            revokedAt: now,
            revokedReason: 'USER_REVOKED',
          })
          .where(eq(refreshTokens.familyId, existingRefresh.familyId));
      }

      // 6. RFC 7009: siempre retornar 200
      return { status: 200, body: undefined };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Failed to revoke token.',
        logPrefix: '[auth.revoke]',
      });
    }
  },
  // --------------------------------------
  // POST - /mfa/verify
  // --------------------------------------
  mfaVerify: async ({ body }, { request, nextRequest }) => {
    try {
      const { mfaToken, code, accountSlug, appSlug } = body;

      // ----- RATE LIMIT por Token + IP -----
      const ip = getClientIp(nextRequest);

      const tokenKey = `mfa:verify:token:${mfaToken}`;
      const ipKey = `mfa:verify:ip:${ip}`;

      const windowMs = 5 * 60 * 1000; // 5 min

      const [tokenRl, ipRl] = await Promise.all([
        checkRateLimit({
          key: tokenKey,
          limit: 5,
          windowMs,
        }),
        checkRateLimit({
          key: ipKey,
          limit: 20,
          windowMs,
        }),
      ]);

      if (!tokenRl.success || !ipRl.success) {
        return {
          status: 429,
          body: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          headers: {
            'X-RateLimit-Limit': String(tokenRl.limit),
            'X-RateLimit-Remaining': String(tokenRl.remaining),
            'X-RateLimit-Reset': tokenRl.resetAt.toISOString(),
          },
        };
      }

      // Get MFA pending record
      const mfaRecord = await db.query.mfaPending.findFirst({
        where: eq(mfaPending.id, mfaToken),
        with: {
          user: true,
          account: true,
          application: true,
        },
      });

      if (!mfaRecord) {
        return {
          status: 401,
          body: { message: 'Invalid or expired MFA token', code: 'INVALID_MFA_TOKEN' },
        };
      }

      // Check if expired
      const now = new Date();
      if (mfaRecord.expiresAt < now) {
        await db.delete(mfaPending).where(eq(mfaPending.id, mfaToken));
        return {
          status: 401,
          body: { message: 'MFA code expired. Please login again.', code: 'MFA_EXPIRED' },
        };
      }

      // Verify account and app slugs match
      if (mfaRecord.account?.slug !== accountSlug || mfaRecord.application?.slug !== appSlug) {
        return {
          status: 401,
          body: { message: 'Invalid request', code: 'INVALID_REQUEST' },
        };
      }

      // Check max attempts
      if (mfaRecord.attempts >= MFA_CONFIG.MAX_ATTEMPTS) {
        await db.delete(mfaPending).where(eq(mfaPending.id, mfaToken));
        return {
          status: 401,
          body: {
            message: 'Too many failed attempts. Please login again.',
            code: 'MFA_MAX_ATTEMPTS',
          },
        };
      }

      // Verify the code
      if (!verifyMfaCode(code, mfaRecord.codeHash)) {
        // Increment attempts
        await db
          .update(mfaPending)
          .set({ attempts: mfaRecord.attempts + 1 })
          .where(eq(mfaPending.id, mfaToken));

        return {
          status: 401,
          body: { message: 'Invalid code', code: 'INVALID_CODE' },
        };
      }

      // Code is valid, delete the MFA pending record
      await db.delete(mfaPending).where(eq(mfaPending.id, mfaToken));

      const user = mfaRecord.user;

      // Create session
      await createSession({
        userId: user.id,
        accountId: mfaRecord.accountId,
        req: request,
      });

      const response: MfaVerifyResponse = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
          status: user.status,
        },
        accountId: mfaRecord.accountId,
      };

      return {
        status: 200,
        body: response,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Failed to verify MFA code.',
        logPrefix: '[auth.mfaVerify]',
      });
    }
  },
  // --------------------------------------
  // POST - /mfa/resend
  // --------------------------------------
  mfaResend: async ({ body }, { nextRequest }) => {
    try {
      const { mfaToken, accountSlug, appSlug } = body;

      // ----- RATE LIMIT por Token + IP -----
      const ip = getClientIp(nextRequest);

      const tokenKey = `mfa:resend:token:${mfaToken}`;
      const ipKey = `mfa:resend:ip:${ip}`;

      const windowMs = 5 * 60 * 1000; // 5 min

      const [tokenRl, ipRl] = await Promise.all([
        checkRateLimit({
          key: tokenKey,
          limit: 3,
          windowMs,
        }),
        checkRateLimit({
          key: ipKey,
          limit: 10,
          windowMs,
        }),
      ]);

      if (!tokenRl.success || !ipRl.success) {
        return {
          status: 429,
          body: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          headers: {
            'X-RateLimit-Limit': String(tokenRl.limit),
            'X-RateLimit-Remaining': String(tokenRl.remaining),
            'X-RateLimit-Reset': tokenRl.resetAt.toISOString(),
          },
        };
      }

      // Get MFA pending record
      const mfaRecord = await db.query.mfaPending.findFirst({
        where: eq(mfaPending.id, mfaToken),
        with: {
          user: true,
          account: true,
          application: true,
        },
      });

      if (!mfaRecord) {
        return {
          status: 400,
          body: { message: 'Invalid or expired MFA token', code: 'INVALID_MFA_TOKEN' },
        };
      }

      // Verify account and app slugs match
      if (mfaRecord.account?.slug !== accountSlug || mfaRecord.application?.slug !== appSlug) {
        return {
          status: 400,
          body: { message: 'Invalid request', code: 'INVALID_REQUEST' },
        };
      }

      const user = mfaRecord.user!;

      // Generate new MFA code
      const mfaCode = generateMfaCode();
      const codeHash = hashMfaCode(mfaCode);
      const expiresAt = getMfaExpiryDate();

      // Update MFA pending record with new code
      await db
        .update(mfaPending)
        .set({
          codeHash,
          expiresAt,
          attempts: 0,
        })
        .where(eq(mfaPending.id, mfaToken));

      // Send MFA code email
      await sendMfaCodeEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`,
        code: mfaCode,
        expiresInMinutes: MFA_CONFIG.EXPIRY_MINUTES,
      });

      const response: MfaResendResponse = {
        message: 'A new code has been sent to your email.',
        maskedEmail: maskEmail(user.email),
      };

      return {
        status: 200,
        body: response,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Failed to resend MFA code.',
        logPrefix: '[auth.mfaResend]',
      });
    }
  },
  // --------------------------------------
  // GET - /branding (public endpoint)
  // --------------------------------------
  branding: async ({ query }) => {
    try {
      const { accountSlug, appSlug } = query;

      const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.slug, accountSlug), eq(accounts.status, 'active')),
      });

      if (!account) {
        return {
          status: 404,
          body: { message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' },
        };
      }

      let application = null;
      if (appSlug) {
        application = await db.query.applications.findFirst({
          where: and(
            eq(applications.accountId, account.id),
            eq(applications.slug, appSlug),
            eq(applications.status, 'active')
          ),
        });
      }

      const response: BrandingResponse = {
        account: {
          name: account.name,
          slug: account.slug,
          logo: account.logo,
          imageAd: account.imageAd,
        },
        application: application
          ? {
              name: application.name,
              slug: application.slug,
              logo: application.logo,
              imageAd: application.imageAd,
            }
          : null,
      };

      return {
        status: 200,
        body: response,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Failed to get branding info.',
        logPrefix: '[auth.branding]',
      });
    }
  },
});
