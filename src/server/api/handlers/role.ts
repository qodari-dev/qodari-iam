import { db } from '@/server/db';
import { roles } from '@/server/db/schema';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { requireAdminPermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { eq, sql } from 'drizzle-orm';
import { contract } from '../contracts';

import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';

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
      await requireAdminPermission(request, appRoute.metadata);

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, ROLE_QUERY_CONFIG);

      const [data, countResult] = await Promise.all([
        db.query.roles.findMany({
          where: whereClause,
          with: buildTypedIncludes(include, ROLE_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(roles)
          .where(whereClause),
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
      await requireAdminPermission(request, appRoute.metadata);

      const role = await db.query.roles.findFirst({
        where: eq(roles.id, id),
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

      const existing = await db.query.roles.findFirst({
        where: eq(roles.slug, body.slug.toLowerCase()),
      });

      if (existing) {
        throwHttpError({
          status: 409,
          message: 'El email ya está registrado',
          code: 'EMAIL_EXISTS',
        });
      }

      const [newRole] = await db
        .insert(roles)
        .values({ ...body, accountId: session?.currentAccountId })
        .returning();

      return { status: 201, body: newRole };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear',
      });
    }
  },

  // ==========================================
  // UPDATE - PATCH /roles/:id
  // ==========================================
  update: async ({ params: { id }, body }, { request, appRoute }) => {
    try {
      await requireAdminPermission(request, appRoute.metadata);

      const existing = await db.query.roles.findFirst({
        where: eq(roles.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Role con ID ${id} no encontrado`,
          code: 'ROLE_NOT_FOUND',
        });
      }

      const [updated] = await db
        .update(roles)
        .set({
          ...body,
        })
        .where(eq(roles.id, id))
        .returning();

      return { status: 200, body: updated };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar ${id}`,
      });
    }
  },

  // ==========================================
  // DELETE - DELETE /roles/:id
  // ==========================================
  delete: async ({ params: { id } }, { request, appRoute }) => {
    try {
      await requireAdminPermission(request, appRoute.metadata);

      const existing = await db.query.roles.findFirst({
        where: eq(roles.id, id),
      });

      if (!existing) {
        throwHttpError({
          status: 404,
          message: `Role con ID ${id} no encontrado`,
          code: 'ROLE_NOT_FOUND',
        });
      }

      await db.delete(roles).where(eq(roles.id, id));

      return {
        status: 200,
        body: existing,
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar ${id}`,
      });
    }
  },
});
