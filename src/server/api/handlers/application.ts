import { db } from '@/server/db';
import { applications, permissions } from '@/server/db/schema';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
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
import { requireAdminPermission } from '@/server/utils/require-permission';
import { deleteObject, isStorageKey } from '@/server/utils/spaces';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { contract } from '../contracts';

type ApplicationColumn = keyof typeof applications.$inferSelect;

const APPLICATION_FIELDS: FieldMap = {
  id: applications.id,
  name: applications.name,
  slug: applications.slug,
  status: applications.status,
  clientType: applications.clientType,
  createdAt: applications.createdAt,
  updatedAt: applications.updatedAt,
} satisfies Partial<Record<ApplicationColumn, (typeof applications)[ApplicationColumn]>>;

const APPLICATION_QUERY_CONFIG: QueryConfig = {
  fields: APPLICATION_FIELDS,
  searchFields: [applications.name, applications.slug],
  defaultSort: { column: applications.createdAt, order: 'desc' },
};

const APPLICATION_INCLUDES = createIncludeMap<typeof db.query.applications>()({
  permissions: {
    relation: 'permissions',
    config: {
      columns: selectCols<typeof db.query.permissions>()('id', 'name', 'resource', 'action'),
    },
  },
});

export const application = tsr.router(contract.application, {
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
      } = buildQuery({ page, limit, search, where, sort }, APPLICATION_QUERY_CONFIG);

      const whereWithAccount = whereClause
        ? and(whereClause, eq(applications.accountId, session.accountId))
        : eq(applications.accountId, session.accountId);

      const [data, countResult] = await Promise.all([
        db.query.applications.findMany({
          where: whereWithAccount,
          with: buildTypedIncludes(include, APPLICATION_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(applications)
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
      return genericTsRestErrorResponse(e, { genericMsg: 'Error al listar aplicaciones' });
    }
  },

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

      const app = await db.query.applications.findFirst({
        where: and(eq(applications.id, id), eq(applications.accountId, session.accountId)),
        with: buildTypedIncludes(query?.include, APPLICATION_INCLUDES),
      });

      if (!app) {
        return { status: 404, body: { message: 'Application not found', code: 'APP_NOT_FOUND' } };
      }

      return { status: 200, body: app };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener aplicación ${id}`,
      });
    }
  },

  create: async ({ body }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.applications.findFirst({
        where: and(eq(applications.accountId, session.accountId), eq(applications.slug, body.slug)),
      });

      if (existing) {
        throwHttpError({
          status: 409,
          message: 'El slug ya está en uso',
          code: 'APP_SLUG_EXISTS',
        });
      }

      const { permissions: permissionsData, ...data } = body;

      const [created] = await db.transaction(async (tx) => {
        const [app] = await tx
          .insert(applications)
          .values({
            ...data,
            accountId: session.accountId,
          })
          .returning();

        if (permissionsData?.length) {
          await tx.insert(permissions).values(
            permissionsData.map((perm) => ({
              ...perm,
              accountId: session.accountId,
              applicationId: app.id,
            }))
          );
        }

        return [app];
      });

      return { status: 201 as const, body: created };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear aplicación',
      });
    }
  },

  update: async ({ params: { id }, body }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const app = await db.query.applications.findFirst({
        where: and(eq(applications.id, id), eq(applications.accountId, session.accountId)),
      });

      if (!app) {
        return { status: 404, body: { message: 'Application not found', code: 'APP_NOT_FOUND' } };
      }

      // Check if we need to delete old images
      const oldLogoKey = app.logo;
      const oldImageKey = app.image;
      const oldImageAdKey = app.imageAd;
      const shouldDeleteOldLogo =
        oldLogoKey && isStorageKey(oldLogoKey) && body.logo !== undefined && body.logo !== oldLogoKey;
      const shouldDeleteOldImage =
        oldImageKey && isStorageKey(oldImageKey) && body.image !== undefined && body.image !== oldImageKey;
      const shouldDeleteOldImageAd =
        oldImageAdKey && isStorageKey(oldImageAdKey) && body.imageAd !== undefined && body.imageAd !== oldImageAdKey;

      const [updated] = await db.transaction(async (tx) => {
        const [appUpdated] = await tx
          .update(applications)
          .set({ ...body })
          .where(and(eq(applications.id, id), eq(applications.accountId, session.accountId)))
          .returning();

        if (body.permissions) {
          if (body.permissions.length) {
            await tx
              .insert(permissions)
              .values(
                body.permissions.map((perm) => ({
                  ...perm,
                  accountId: session.accountId,
                  applicationId: id,
                }))
              )
              .onConflictDoUpdate({
                target: [
                  permissions.accountId,
                  permissions.applicationId,
                  permissions.resource,
                  permissions.action,
                ],
                set: { name: sql`excluded.name`, description: sql`excluded.description` },
              });
          }

          const permissionsIds = [];
          for (const perm of body.permissions) {
            const [p] = await tx
              .select({ id: permissions.id })
              .from(permissions)
              .where(
                and(
                  eq(permissions.accountId, session.accountId),
                  eq(permissions.applicationId, id),
                  eq(permissions.resource, perm.resource),
                  eq(permissions.action, perm.action)
                )
              );
            if (!p) {
              continue;
            }
            permissionsIds.push(p.id);
          }
          await tx.delete(permissions).where(notInArray(permissions.id, permissionsIds));
        }

        return [appUpdated];
      });

      // Delete old images from storage after successful update
      const imagesToDelete = [
        shouldDeleteOldLogo && oldLogoKey,
        shouldDeleteOldImage && oldImageKey,
        shouldDeleteOldImageAd && oldImageAdKey,
      ].filter((key): key is string => Boolean(key));

      await Promise.all(
        imagesToDelete.map(async (key) => {
          try {
            await deleteObject(key);
          } catch {
            console.error(`Failed to delete old image: ${key}`);
          }
        })
      );

      return { status: 200, body: updated };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar aplicación ${id}`,
      });
    }
  },

  delete: async ({ params: { id } }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const app = await db.query.applications.findFirst({
        where: and(eq(applications.id, id), eq(applications.accountId, session.accountId)),
      });

      if (!app) {
        return { status: 404, body: { message: 'Application not found', code: 'APP_NOT_FOUND' } };
      }

      const imagesToDelete = [app.logo, app.image, app.imageAd].filter(
        (key): key is string => Boolean(key) && isStorageKey(key)
      );

      const [deleted] = await db
        .delete(applications)
        .where(and(eq(applications.id, id), eq(applications.accountId, session.accountId)))
        .returning();

      // Delete all images from storage after successful deletion
      await Promise.all(
        imagesToDelete.map(async (key) => {
          try {
            await deleteObject(key);
          } catch {
            console.error(`Failed to delete image: ${key}`);
          }
        })
      );

      return { status: 200, body: deleted };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar aplicación ${id}`,
      });
    }
  },
});
