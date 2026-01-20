import type { NextRequest } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/server/db';
import { apiClients, applications, userRoles, users, type Session } from '@/server/db/schema';
import { getSessionFromRequest } from '@/server/utils/session';
import type { MeResponse } from '@/schemas/auth';
import { getUserRolesAndPermissions } from './get-user-roles-and-permissions';
import { throwHttpError } from './generic-ts-rest-error';
import { TsRestRequest } from '@ts-rest/serverless/next';
import { verifyAccessToken, type AccessTokenPayload } from './jwt';

type AuthContextOptions = {
  appSlug?: string;
};

export type AuthContext = MeResponse & {
  session: Session;
};

// M2M Auth Context for API Clients using Bearer tokens
export type M2MAuthContext = {
  type: 'api_client';
  apiClientId: string;
  apiClientName: string;
  accountId: string;
  applicationId: string;
  applicationName: string;
  permissions: string[];
};

// Unified Auth Context that can be either user or API client
export type UnifiedAuthContext = (AuthContext & { type: 'user' }) | M2MAuthContext;

export async function getAuthContextFromRequest(
  request: NextRequest | TsRestRequest,
  options?: AuthContextOptions
): Promise<AuthContext> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    throwHttpError({
      status: 401,
      message: 'Not authenticated',
      code: 'UNAUTHENTICATED',
    });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user || user.status === 'suspended') {
    throwHttpError({
      status: 401,
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    });
  }

  // 1) Determinar cuenta actual
  const currentAccountId = session.accountId;

  // 2) Determinar aplicaciones visibles para ese usuario en esa cuenta
  const applicationSelect = {
    id: applications.id,
    name: applications.name,
    slug: applications.slug,
    status: applications.status,
    logo: applications.logo,
    image: applications.image,
    description: applications.description,
    homeUrl: applications.homeUrl,
  };

  let apps: MeResponse['applications'] = [];

  if (user.isAdmin) {
    apps = await db
      .select(applicationSelect)
      .from(applications)
      .where(and(eq(applications.accountId, currentAccountId), eq(applications.status, 'active')));
  } else {
    const userRolesData = await db.query.userRoles.findMany({
      where: eq(userRoles.userId, user.id),
      with: {
        role: true,
      },
    });

    const appIds = userRolesData.map((userRole) => userRole.role.applicationId);

    if (appIds.length > 0) {
      apps = await db
        .select(applicationSelect)
        .from(applications)
        .where(and(inArray(applications.id, appIds), eq(applications.status, 'active')));
    }
  }

  // 3) Roles y permisos para una app concreta (opcional)
  let roles: string[] | undefined;
  let permissions: string[] | undefined;

  if (options?.appSlug) {
    const app = await db.query.applications.findFirst({
      where: and(
        eq(applications.accountId, currentAccountId),
        eq(applications.slug, options.appSlug)
      ),
    });

    if (app) {
      const r = await getUserRolesAndPermissions({
        userId: user.id,
        applicationId: app.id,
      });

      roles = r.roles;
      permissions = r.permissions;
    }
  }

  const context: AuthContext = {
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
    applications: apps,
    roles,
    permissions,
  };

  return context;
}

/**
 * Get M2M Auth Context from Bearer token
 * Used for API Clients authenticating via client_credentials flow
 */
export async function getM2MAuthContext(
  token: string,
  options?: { requiredPermission?: string }
): Promise<M2MAuthContext> {
  // 1) Find the application by trying to verify the token with each app's secret
  // First, we need to decode the token to get the appId from the payload
  // Since we don't know which app's secret to use yet, we'll decode without verification first
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    throwHttpError({
      status: 401,
      message: 'Invalid token format',
      code: 'INVALID_TOKEN',
    });
  }

  let payload: AccessTokenPayload;
  try {
    // Decode the payload (middle part) without verification to get appId
    const payloadJson = Buffer.from(tokenParts[1], 'base64url').toString();
    payload = JSON.parse(payloadJson) as AccessTokenPayload;
  } catch {
    throwHttpError({
      status: 401,
      message: 'Invalid token payload',
      code: 'INVALID_TOKEN',
    });
  }

  // 2) Find the application
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, payload.appId),
  });

  if (!app) {
    throwHttpError({
      status: 401,
      message: 'Application not found',
      code: 'APP_NOT_FOUND',
    });
  }

  // 3) Verify the token with the app's JWT secret
  let verifiedPayload: AccessTokenPayload;
  try {
    verifiedPayload = await verifyAccessToken(token, app.clientJwtSecret);
  } catch (error) {
    throwHttpError({
      status: 401,
      message: error instanceof Error ? error.message : 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  // 4) Verify this is an M2M token (client_credentials grant)
  if (verifiedPayload.grantType !== 'client_credentials') {
    throwHttpError({
      status: 401,
      message: 'Invalid token type for M2M authentication',
      code: 'INVALID_TOKEN_TYPE',
    });
  }

  // 5) Find the API Client
  const apiClient = await db.query.apiClients.findFirst({
    where: eq(apiClients.id, verifiedPayload.sub),
  });

  if (!apiClient || apiClient.status !== 'active') {
    throwHttpError({
      status: 401,
      message: 'API Client not found or inactive',
      code: 'API_CLIENT_NOT_FOUND',
    });
  }

  // 6) Check required permission if specified
  if (options?.requiredPermission) {
    if (!verifiedPayload.permissions.includes(options.requiredPermission)) {
      throwHttpError({
        status: 403,
        message: `Missing required permission: ${options.requiredPermission}`,
        code: 'FORBIDDEN',
      });
    }
  }

  return {
    type: 'api_client',
    apiClientId: apiClient.id,
    apiClientName: apiClient.name,
    accountId: verifiedPayload.accountId,
    applicationId: verifiedPayload.appId,
    applicationName: app.name,
    permissions: verifiedPayload.permissions,
  };
}

type UnifiedAuthContextOptions = {
  appSlug?: string;
  requiredPermission?: string;
};

/**
 * Unified authentication function that supports both:
 * 1. Bearer token (M2M) - for API Clients using client_credentials flow
 * 2. Cookie session - for users logged in via the web UI
 *
 * Priority: Bearer token first, then session cookie
 */
export async function getUnifiedAuthContext(
  request: NextRequest | TsRestRequest,
  options?: UnifiedAuthContextOptions
): Promise<UnifiedAuthContext> {
  // 1) Try Bearer token first (M2M)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const m2mContext = await getM2MAuthContext(token, {
      requiredPermission: options?.requiredPermission,
    });
    return m2mContext;
  }

  // 2) Fallback to session cookie (user)
  const userContext = await getAuthContextFromRequest(request, {
    appSlug: options?.appSlug,
  });

  return {
    ...userContext,
    type: 'user',
  };
}
