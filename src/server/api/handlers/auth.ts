import { createHash, randomUUID } from "node:crypto";

import { tsr } from "@ts-rest/serverless/next";
import { contract } from "../contracts";
import { db } from "@/server/db";
import {
  accountMembers,
  Application,
  applications,
  authorizationCodes,
  refreshTokens,
  sessions,
  userRoles,
  users,
} from "@/server/db/schema";
import { genericTsRestErrorResponse } from "@/server/utils/generic-ts-rest-error";
import { and, eq } from "drizzle-orm";
import { LoginResponse, MeResponse, OauthTokenResponse } from "@/schemas/auth";
import { verifyPassword } from "@/server/utils/password";
import {
  clearSessionCookie,
  createSession,
  getSessionFromRequest,
} from "@/server/utils/session";
import { signAccessToken } from "@/server/utils/jwt";
import { env } from "@/env";

const REFRESH_TOKEN_HASH_ALG = "sha256";

function hashRefreshToken(token: string): string {
  return createHash(REFRESH_TOKEN_HASH_ALG).update(token).digest("hex");
}

function validateClientAuth(app: Application, clientSecretFromBody?: string) {
  return !!clientSecretFromBody && clientSecretFromBody === app.clientSecret;
}

async function getUserAppRolesAndPermissions(opts: {
  userId: string;
  accountId: string;
  applicationId: string;
}) {
  const { userId, accountId, applicationId } = opts;

  const userRolesForAccount = await db.query.userRoles.findMany({
    where: and(
      eq(userRoles.userId, userId),
      eq(userRoles.accountId, accountId),
    ),
    with: {
      role: {
        with: {
          rolePermissions: {
            with: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const roleSlugs = new Set<string>();
  const permSet = new Set<string>();

  for (const ur of userRolesForAccount) {
    const role = ur.role;
    if (!role) continue;
    if (role.applicationId !== applicationId) continue;

    // roles
    roleSlugs.add(role.slug);

    // permisos (resource:action)
    for (const rp of role.rolePermissions ?? []) {
      const p = rp.permission;
      if (!p) continue;
      permSet.add(`${p.resource}:${p.action}`);
    }
  }

  return {
    roles: Array.from(roleSlugs),
    permissions: Array.from(permSet),
  };
}

export const auth = tsr.router(contract.auth, {
  // --------------------------------------
  // POST - /login
  // --------------------------------------
  login: async ({ body }, { request }) => {
    try {
      const { email, password } = body;

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
          body: { message: "User has no associated accounts" },
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
        genericMsg: "Something went wrong querying applications.",
        logPrefix: "[auth.login]",
      });
    }
  },
  // --------------------------------------
  // GET - /me
  // --------------------------------------
  me: async ({ query }, { request }) => {
    try {
      const session = await getSessionFromRequest(request);
      if (!session) {
        return {
          status: 401,
          body: { message: "Not authenticated" },
        };
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
      });

      if (!user) {
        return {
          status: 401,
          body: { message: "User not found" },
        };
      }

      const memberships = await db.query.accountMembers.findMany({
        where: eq(accountMembers.userId, user.id),
        with: { account: true },
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
          body: { message: "User has no associated accounts" },
        };
      }

      let currentAccountId = session.accountId ?? accountsList[0]?.id;

      const requestedAccountId = query?.accountId;
      if (requestedAccountId) {
        const match = accountsList.find((a) => a.id === requestedAccountId);
        if (match) {
          currentAccountId = match.id;
        }
      }

      const response: MeResponse = {
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

      if (query?.appSlug && currentAccountId) {
        const app = await db.query.applications.findFirst({
          where: eq(applications.slug, query.appSlug),
        });

        if (app) {
          const { roles, permissions } = await getUserAppRolesAndPermissions({
            userId: user.id,
            accountId: currentAccountId,
            applicationId: app.id,
          });

          response.roles = roles;
          response.permissions = permissions;
        }
      }
      return { status: 200, body: response };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: "Something went wrong querying applications.",
        logPrefix: "[auth.me]",
      });
    }
  }, // --------------------------------------
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
        genericMsg: "Something went wrong querying applications.",
        logPrefix: "[auth.logout]",
      });
    }
  }, // --------------------------------------
  // POST - /oauthToken
  // --------------------------------------
  oauthToken: async ({ body }) => {
    try {
      if (body.grant_type === "authorization_code") {
        const { code, client_id, client_secret, redirect_uri, code_verifier } =
          body;

        // 1) app
        const app = await db.query.applications.findFirst({
          where: eq(applications.clientId, client_id),
        });
        if (!app || app.status !== "active") {
          return {
            status: 401,
            body: { message: "Invalid client", code: "invalid_client" },
          };
        }

        // 2) Validar client_secret si la app es confidential
        if (!validateClientAuth(app, client_secret)) {
          return {
            status: 401,
            body: {
              message: "Invalid client credentials",
              code: "invalid_client",
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
              message: "Invalid authorization code",
              code: "invalid_grant",
            },
          };
        }

        const now = new Date();
        if (
          authCode.applicationId !== app.id ||
          authCode.used ||
          authCode.expiresAt < now
        ) {
          return {
            status: 400,
            body: {
              message: "Invalid or expired authorization code",
              code: "invalid_grant",
            },
          };
        }

        if (redirect_uri && authCode.redirectUri) {
          if (redirect_uri !== authCode.redirectUri) {
            return {
              status: 400,
              body: {
                message: "Invalid redirect_uri",
                code: "invalid_request",
              },
            };
          }
        }

        // 4) PKCE
        if (authCode.codeChallenge && authCode.codeChallengeMethod === "S256") {
          if (!code_verifier) {
            return {
              status: 400,
              body: {
                message: "code_verifier is required for PKCE",
                code: "invalid_request",
              },
            };
          }
          const hash = createHash("sha256")
            .update(code_verifier)
            .digest("base64url");

          if (hash !== authCode.codeChallenge) {
            return {
              status: 400,
              body: { message: "Invalid code_verifier", code: "invalid_grant" },
            };
          }
        }

        // 5) Marcar auth code como usado
        await db
          .update(authorizationCodes)
          .set({ used: true, usedAt: now })
          .where(eq(authorizationCodes.id, authCode.id));

        // 6) Access token
        const { roles, permissions } = await getUserAppRolesAndPermissions({
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
        });

        // 7) Refresh + familyId
        const familyId = randomUUID();
        const rawRefreshToken = randomUUID();
        const refreshTokenHash = hashRefreshToken(rawRefreshToken);
        const refreshExpiresAt = new Date(
          Date.now() + app.refreshTokenExp * 1000,
        );

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
          tokenType: "Bearer",
          expiresIn: app.accessTokenExp,
          scope: authCode.scope ?? "",
        };

        return { status: 200, body: response };
      } else if (body.grant_type === "refresh_token") {
        const { refresh_token, client_id, client_secret } = body;

        // 1) app
        const app = await db.query.applications.findFirst({
          where: eq(applications.clientId, client_id),
        });
        if (!app || app.status !== "active") {
          return {
            status: 401,
            body: { message: "Invalid client", code: "invalid_client" },
          };
        }

        if (!validateClientAuth(app, client_secret)) {
          return {
            status: 401,
            body: {
              message: "Invalid client credentials",
              code: "invalid_client",
            },
          };
        }

        // 2) Buscar RT por hash + app
        const hashed = hashRefreshToken(refresh_token);

        const existingRefresh = await db.query.refreshTokens.findFirst({
          where: and(
            eq(refreshTokens.tokenHash, hashed),
            eq(refreshTokens.applicationId, app.id),
          ),
        });

        if (!existingRefresh) {
          return {
            status: 401,
            body: { message: "Invalid refresh token", code: "invalid_grant" },
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
              revokedReason: "REUSE_DETECTED",
            })
            .where(eq(refreshTokens.familyId, existingRefresh.familyId));

          return {
            status: 401,
            body: {
              message: "Refresh token reuse detected",
              code: "invalid_grant",
            },
          };
        }

        if (existingRefresh.expiresAt && existingRefresh.expiresAt < now) {
          return {
            status: 401,
            body: { message: "Expired refresh token", code: "invalid_grant" },
          };
        }

        // 4) Rotar refresh token
        const newRawRefreshToken = randomUUID();
        const newRefreshHash = hashRefreshToken(newRawRefreshToken);
        const newRefreshExpiresAt = new Date(
          Date.now() + app.refreshTokenExp * 1000,
        );

        // nuevo token, misma familia
        await db.insert(refreshTokens).values({
          familyId: existingRefresh.familyId,
          userId: existingRefresh.userId,
          accountId: existingRefresh.accountId,
          applicationId: existingRefresh.applicationId,
          tokenHash: newRefreshHash,
          expiresAt: newRefreshExpiresAt,
          revoked: false,
        });

        // marcar viejo como ROTATED
        await db
          .update(refreshTokens)
          .set({
            revoked: true,
            revokedAt: now,
            revokedReason: "ROTATED",
            lastUsedAt: now,
          })
          .where(eq(refreshTokens.id, existingRefresh.id));

        // 5) nuevo access token
        const { roles, permissions } = await getUserAppRolesAndPermissions({
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
        });

        const response: OauthTokenResponse = {
          accessToken,
          refreshToken: newRawRefreshToken,
          tokenType: "Bearer",
          expiresIn: app.accessTokenExp,
        };

        return { status: 200, body: response };
      }

      return {
        status: 400,
        body: { message: "Unsupported grant_type" },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: "Something went wrong querying applications.",
        logPrefix: "[auth.oauthToken]",
      });
    }
  },
});
