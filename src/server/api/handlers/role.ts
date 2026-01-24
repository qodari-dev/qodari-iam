import { db } from '@/server/db';
import { applications, permissions, rolePermissions, roles } from '@/server/db/schema';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { requireAdminPermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, inArray, sql } from 'drizzle-orm';
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

type RoleColumn = keyof typeof roles.$inferSelect;

const ROLE_FIELDS: FieldMap = {
  id: roles.id,
  accountId: roles.accountId,
  applicationId: roles.applicationId,
  name: roles.name,
  slug: roles.slug,
  description: roles.description,
  createdAt: roles.createdAt,
  updatedAt: roles.updatedAt,
} satisfies Partial<Record<RoleColumn, (typeof roles)[RoleColumn]>>;

const ROLE_QUERY_CONFIG: QueryConfig = {
  fields: ROLE_FIELDS,
  searchFields: [roles.name, roles.slug, roles.description],
  defaultSort: { column: roles.createdAt, order: 'desc' },
};

const ROLE_INCLUDES = createIncludeMap<typeof db.query.roles>()({
  application: {
    relation: 'application',
    config: {},
  },
  permissions: {
    relation: 'rolePermissions',
    config: {
      with: {
        permission: {
          columns: selectCols<typeof db.query.permissions>()(
            'id',
            'name',
            'resource',
            'action',
            'description'
          ),
        },
      },
    },
  },
});

// ============================================
// HANDLER
// ============================================

export const role = tsr.router(contract.role, {
  // ==========================================
  // LIST - GET /roles
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
      } = buildQuery({ page, limit, search, where, sort }, ROLE_QUERY_CONFIG);

      const whereWithAccount = whereClause
        ? and(whereClause, eq(roles.accountId, session.accountId))
        : eq(roles.accountId, session.accountId);

      const [data, countResult] = await Promise.all([
        db.query.roles.findMany({
          where: whereWithAccount,
          with: buildTypedIncludes(include, ROLE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(roles)
          .where(whereWithAccount),
      ]);

      return {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(countResult[0]?.count ?? 0, page, limit),
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, { genericMsg: 'Error al listar' });
    }
  },

  // ==========================================
  // GET - GET /roles/:id
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

      const role = await db.query.roles.findFirst({
        where: and(eq(roles.id, id), eq(roles.accountId, session.accountId)),
        with: buildTypedIncludes(query?.include, ROLE_INCLUDES),
      });

      if (!role) {
        return {
          status: 404,
          body: { message: 'Role not found', code: 'ROLE_NOT_FOUND' },
        };
      }

      return { status: 200, body: role };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /roles
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

      const existing = await db.query.roles.findFirst({
        where: and(eq(roles.accountId, session.accountId), eq(roles.slug, body.slug.toLowerCase())),
      });

      if (existing) {
        throwHttpError({
          status: 409,
          message: 'El email ya está registrado',
          code: 'EMAIL_EXISTS',
        });
      }

      const [newRole] = await db.transaction(async (tx) => {
        const app = await tx.query.applications.findFirst({
          where: and(
            eq(applications.id, body.applicationId),
            eq(applications.accountId, session!.accountId)
          ),
        });
        if (!app) {
          throwHttpError({
            status: 404,
            message: 'Application not found for this account',
            code: 'APP_NOT_FOUND',
          });
        }

        const [roleInserted] = await tx
          .insert(roles)
          .values({ ...body, slug: body.slug.toLowerCase(), accountId: session!.accountId })
          .returning();

        if (body.permissions?.length) {
          const validPerms = await tx
            .select({ id: permissions.id })
            .from(permissions)
            .where(
              and(
                eq(permissions.accountId, session!.accountId),
                eq(permissions.applicationId, body.applicationId),
                inArray(
                  permissions.id,
                  body.permissions.map((p) => p.permissionId)
                )
              )
            );

          if (validPerms.length !== body.permissions.length) {
            throwHttpError({
              status: 400,
              message: 'Algunos permisos no pertenecen a la aplicación o cuenta',
              code: 'PERMISSIONS_INVALID',
            });
          }

          await tx.insert(rolePermissions).values(
            body.permissions.map((p) => ({
              roleId: roleInserted.id,
              permissionId: p.permissionId,
            }))
          );
        }

        return [roleInserted];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        resourceId: newRole.id,
        resourceLabel: newRole.name,
        status: 'success',
        afterValue: {
          ...newRole,
          _permissionIds: body.permissions?.map((p) => p.permissionId) ?? [],
        },
        ipAddress,
        userAgent,
      });
      return { status: 201, body: newRole };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear',
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'create',
        functionName: 'create',
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // UPDATE - PATCH /roles/:id
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

      const existing = await db.query.roles.findFirst({
        where: and(eq(roles.id, id), eq(roles.accountId, session.accountId)),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Role con ID ${id} no encontrado`,
          code: 'ROLE_NOT_FOUND',
        });
      }

      // Query existing role permissions before update for audit
      const existingRolePerms = await db.query.rolePermissions.findMany({
        where: eq(rolePermissions.roleId, id),
      });

      const [updated] = await db.transaction(async (tx) => {
        if (body.applicationId) {
          const app = await tx.query.applications.findFirst({
            where: and(
              eq(applications.id, body.applicationId),
              eq(applications.accountId, session!.accountId)
            ),
          });
          if (!app) {
            throwHttpError({
              status: 404,
              message: 'Application not found for this account',
              code: 'APP_NOT_FOUND',
            });
          }
        }

        const [roleUpdated] = await tx
          .update(roles)
          .set({
            ...body,
            slug: body.slug ? body.slug.toLowerCase() : existing.slug,
          })
          .where(and(eq(roles.id, id), eq(roles.accountId, session!.accountId)))
          .returning();

        if (body.permissions) {
          await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

          if (body.permissions.length) {
            const validPerms = await tx
              .select({ id: permissions.id })
              .from(permissions)
              .where(
                and(
                  eq(permissions.accountId, session!.accountId),
                  eq(permissions.applicationId, body.applicationId ?? roleUpdated.applicationId),
                  inArray(
                    permissions.id,
                    body.permissions.map((p) => p.permissionId)
                  )
                )
              );

            if (validPerms.length !== body.permissions.length) {
              throwHttpError({
                status: 400,
                message: 'Algunos permisos no pertenecen a la aplicación o cuenta',
                code: 'PERMISSIONS_INVALID',
              });
            }

            await tx.insert(rolePermissions).values(
              body.permissions.map((p) => ({
                roleId: roleUpdated.id,
                permissionId: p.permissionId,
              }))
            );
          }
        }

        return [roleUpdated];
      });

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: existing.id,
        resourceLabel: updated.name,
        status: 'success',
        beforeValue: {
          ...existing,
          _permissionIds: existingRolePerms.map((rp) => rp.permissionId),
        },
        afterValue: {
          ...updated,
          _permissionIds:
            body.permissions?.map((p) => p.permissionId) ??
            existingRolePerms.map((rp) => rp.permissionId),
        },
        ipAddress,
        userAgent,
      });
      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: id,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },

  // ==========================================
  // DELETE - DELETE /roles/:id
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

      const existing = await db.query.roles.findFirst({
        where: and(eq(roles.id, id), eq(roles.accountId, session.accountId)),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Role con ID ${id} no encontrado`,
          code: 'ROLE_NOT_FOUND',
        });
      }

      // Query existing role permissions before delete for audit
      const existingRolePerms = await db.query.rolePermissions.findMany({
        where: eq(rolePermissions.roleId, id),
      });

      await db.delete(roles).where(eq(roles.id, id));

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: existing.id,
        resourceLabel: existing.name,
        status: 'success',
        beforeValue: {
          ...existing,
          _permissionIds: existingRolePerms.map((rp) => rp.permissionId),
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
        genericMsg: `Error al eliminar ${id}`,
      });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'delete',
        functionName: 'delete',
        resourceId: id,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          id,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },
});
