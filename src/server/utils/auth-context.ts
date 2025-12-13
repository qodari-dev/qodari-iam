import type { NextRequest } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/server/db';
import { accountMembers, applications, userRoles, users, type Session } from '@/server/db/schema';
import { getSessionFromRequest } from '@/server/utils/session';
import type { MeResponse } from '@/schemas/auth';
import { getUserRolesAndPermissions } from './get-user-roles-and-permissions';
import { throwHttpError } from './generic-ts-rest-error';
import { TsRestRequest } from '@ts-rest/serverless/next';

type AuthContextOptions = {
  accountIdOverride?: string;
  appSlug?: string;
};

export type AuthContext = MeResponse & {
  session: Session;
};

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
    throwHttpError({
      status: 400,
      message: 'User has no associated accounts',
      code: 'NO_ACCOUNTS',
    });
  }

  // 1) Determinar cuenta actual
  let currentAccountId = session.accountId ?? accountsList[0].id;

  if (options?.accountIdOverride) {
    const match = accountsList.find((a) => a.id === options.accountIdOverride);
    if (match) {
      currentAccountId = match.id;
    }
  }

  // 2) Determinar aplicaciones visibles para ese usuario en esa cuenta
  const applicationSelect = {
    id: applications.id,
    name: applications.name,
    slug: applications.slug,
    status: applications.status,
    logo: applications.logo,
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
        accountId: currentAccountId,
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
    accounts: accountsList,
    currentAccountId,
    applications: apps,
    roles,
    permissions,
  };

  return context;
}
