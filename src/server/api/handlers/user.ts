import { db } from '@/server/db';
import {
  User,
  USER_SENSITIVE_FIELDS,
  userRoles,
  users,
  UserSensitiveField,
} from '@/server/db/schema';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { hashPassword } from '@/server/utils/password';
import { requireAdminPermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { contract } from '../contracts';

import {
  buildTypedIncludes,
  createIncludeMap,
  selectCols,
} from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { logAudit } from '@/server/utils/audit-logger';
import { getClientIp } from '@/server/utils/get-client-ip';
import { UnifiedAuthContext } from '@/server/utils/auth-context';

// ============================================
// CONFIG
// ============================================

type UserColumn = keyof typeof users.$inferSelect;

const USER_FIELDS: FieldMap = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  status: users.status,
  isAdmin: users.isAdmin,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastLoginAt: users.lastLoginAt,
} satisfies Partial<Record<UserColumn, (typeof users)[UserColumn]>>;

const USER_QUERY_CONFIG: QueryConfig = {
  fields: USER_FIELDS,
  searchFields: [users.email, users.firstName, users.lastName],
  defaultSort: { column: users.createdAt, order: 'desc' },
};

const USER_INCLUDES = createIncludeMap<typeof db.query.users>()({
  roles: {
    relation: 'userRoles',
    config: {
      with: {
        role: {
          with: {
            rolePermissions: {
              with: { permission: true },
            },
          },
        },
      },
    },
  },
  sessions: {
    relation: 'sessions',
    config: {
      columns: selectCols<typeof db.query.sessions>()(
        'id',
        'userAgent',
        'ipAddress',
        'lastActivityAt',
        'expiresAt',
        'createdAt'
      ),
      limit: 10,
    },
  },
  auditLogs: {
    relation: 'auditLogs',
    config: {
      columns: selectCols<typeof db.query.auditLogs>()(
        'id',
        'action',
        'resource',
        'resourceId',
        'ipAddress',
        'createdAt'
      ),
      limit: 50,
    },
  },
});

// Campos sensibles a excluir
const SENSITIVE_COLUMNS = Object.fromEntries(
  USER_SENSITIVE_FIELDS.map((f) => [f, false])
) as Record<UserSensitiveField, false>;

// ============================================
// HANDLER
// ============================================

export const user = tsr.router(contract.user, {
  // ==========================================
  // LIST - GET /users
  // ==========================================
  list: async ({ query }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, USER_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.users.findMany({
          columns: SENSITIVE_COLUMNS,
          where: whereClause,
          with: buildTypedIncludes(include, USER_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(whereClause),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      const response = {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(totalCount, page, limit),
        },
      };
      return response;
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al listar usuarios',
      });
    }
  },

  // ==========================================
  // GET - GET /users/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const user = await db.query.users.findFirst({
        columns: SENSITIVE_COLUMNS,
        where: eq(users.id, id),
        with: buildTypedIncludes(query?.include, USER_INCLUDES),
      });

      if (!user) {
        throwHttpError({
          status: 404,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      return { status: 200, body: user };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener usuario ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /users
  // ==========================================
  create: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }
      const { roles, ...data } = body;

      const existing = await db.query.users.findFirst({
        where: eq(users.email, body.email.toLowerCase()),
      });

      if (existing) {
        throwHttpError({
          status: 409,
          message: 'El email ya está registrado',
          code: 'EMAIL_EXISTS',
        });
      }

      const passwordHash = await hashPassword(data.password);

      const newUser = await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({
            ...data,
            email: data.email.toLowerCase(),
            accountId: session!.accountId,
            passwordHash,
          })
          .returning();
        if (roles && roles.length > 0) {
          await tx.insert(userRoles).values(
            roles.map(({ roleId }) => ({
              userId: newUser.id,
              roleId,
            }))
          );
        }
        return newUser;
      });

      const {
        passwordHash: _,
        emailVerificationToken: __,
        passwordResetToken: ___,
        ...safeUser
      } = newUser;
      logAudit(session, {
        action: 'create',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: newUser.id,
        resourceLabel: `${newUser.firstName} ${newUser.lastName}`,
        status: 'success',
        afterValue: {
          ...safeUser,
        },
        ipAddress,
        userAgent,
        metadata: {
          action: 'create',
        },
      });

      return { status: 201, body: safeUser };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear usuario',
      });
      await logAudit(session, {
        action: 'create',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          action: 'create',
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // UPDATE - PATCH /users/:id
  // ==========================================
  update: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }
      const { roles, password, ...data } = body;

      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: SENSITIVE_COLUMNS,
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Usuario con ID ${id} no encontrado`,
          code: 'USER_NOT_FOUND',
        });
      }

      // Prepare update data with optional password
      const updateData: Partial<User> = { ...data };
      if (password && password.length >= 8) {
        updateData.passwordHash = await hashPassword(password);
      }

      const updated = await db.transaction(async (tx) => {
        const [updated] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, id))
          .returning();
        if (roles && roles.length > 0) {
          await tx
            .insert(userRoles)
            .values(
              roles.map(({ roleId }) => ({
                userId: id,
                roleId,
              }))
            )
            .onConflictDoNothing();
        }
        const rolesIds = roles?.map(({ roleId }) => roleId) ?? [];
        await tx
          .delete(userRoles)
          .where(and(eq(userRoles.userId, id), notInArray(userRoles.roleId, rolesIds)));
        return updated;
      });

      const {
        passwordHash: _,
        emailVerificationToken: __,
        passwordResetToken: ___,
        ...safeUser
      } = updated;

      logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: existing.id,
        resourceLabel: `${existing.firstName} ${existing.lastName}`,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        afterValue: {
          ...safeUser,
        },
        ipAddress,
        userAgent,
        metadata: {
          action: 'update',
        },
      });

      return { status: 200, body: safeUser };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar usuario ${id}`,
      });
      await logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: id,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          action: 'update',
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // DELETE - DELETE /users/:id
  // ==========================================
  delete: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: SENSITIVE_COLUMNS,
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Usuario con ID ${id} no encontrado`,
          code: 'USER_NOT_FOUND',
        });
      }

      await db.delete(users).where(eq(users.id, id));

      logAudit(session, {
        action: 'delete',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: existing.id,
        resourceLabel: `${existing.firstName} ${existing.lastName}`,
        status: 'success',
        beforeValue: {
          ...existing,
          action: 'delete',
        },
        ipAddress,
        userAgent,
      });

      return {
        status: 200,
        body: existing,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar usuario ${id}`,
      });
      await logAudit(session, {
        action: 'delete',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: id,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          id,
          action: 'delete',
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // SET PASSWORD - POST /users/:id/set-password
  // ==========================================
  setPassword: async ({ params: { id }, body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: SENSITIVE_COLUMNS,
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Usuario con ID ${id} no encontrado`,
          code: 'USER_NOT_FOUND',
        });
      }

      const passwordHash = await hashPassword(body.password);

      await db
        .update(users)
        .set({
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: existing.id,
        resourceLabel: `${existing.firstName} ${existing.lastName}`,
        status: 'success',
        metadata: {
          action: 'set_password',
        },
        ipAddress,
        userAgent,
      });
      return {
        status: 200,
        body: undefined,
      };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al establecer password para usuario ${id}`,
      });
      await logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: id,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          action: 'set_password',
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // SUSPEND - POST /users/:id/suspend
  // ==========================================
  suspend: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: SENSITIVE_COLUMNS,
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Usuario con ID ${id} no encontrado`,
          code: 'USER_NOT_FOUND',
        });
      }

      const [updated] = await db
        .update(users)
        .set({
          status: 'suspended',
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      const {
        passwordHash: _,
        emailVerificationToken: __,
        passwordResetToken: ___,
        ...safeUser
      } = updated;

      logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: existing.id,
        resourceLabel: `${existing.firstName} ${existing.lastName}`,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        afterValue: {
          ...safeUser,
        },
        metadata: {
          action: 'suspend',
        },
        ipAddress,
        userAgent,
      });
      return { status: 200, body: safeUser };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al suspender usuario ${id}`,
      });
      await logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: id,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          action: 'suspend',
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // ACTIVATE - POST /users/:id/activate
  // ==========================================
  activate: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: SENSITIVE_COLUMNS,
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Usuario con ID ${id} no encontrado`,
          code: 'USER_NOT_FOUND',
        });
      }

      const [updated] = await db
        .update(users)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      const {
        passwordHash: _,
        emailVerificationToken: __,
        passwordResetToken: ___,
        ...safeUser
      } = updated;

      logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: existing.id,
        resourceLabel: `${existing.firstName} ${existing.lastName}`,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        afterValue: {
          ...safeUser,
        },
        metadata: {
          action: 'activate',
        },
        ipAddress,
        userAgent,
      });
      return { status: 200, body: safeUser };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al activar usuario ${id}`,
      });
      await logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: id,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          action: 'activate',
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // UNLOCK - POST /users/:id/unlock
  // ==========================================
  unlock: async ({ params: { id } }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: SENSITIVE_COLUMNS,
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Usuario con ID ${id} no encontrado`,
          code: 'USER_NOT_FOUND',
        });
      }

      const [updated] = await db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      const {
        passwordHash: _,
        emailVerificationToken: __,
        passwordResetToken: ___,
        ...safeUser
      } = updated;

      logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: existing.id,
        resourceLabel: `${existing.firstName} ${existing.lastName}`,
        status: 'success',
        beforeValue: {
          ...existing,
        },
        afterValue: {
          ...safeUser,
        },
        metadata: {
          action: 'unlock',
        },
        ipAddress,
        userAgent,
      });
      return { status: 200, body: safeUser };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al desbloquear usuario ${id}`,
      });
      await logAudit(session, {
        action: 'update',
        actionKey: appRoute.metadata.permissionKey,
        resource: 'users',
        resourceId: id,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          action: 'unlock',
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },
});
