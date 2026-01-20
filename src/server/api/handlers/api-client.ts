import { randomBytes, randomUUID } from 'node:crypto';
import { db } from '@/server/db';
import { apiClientRoles, apiClients } from '@/server/db/schema';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { hashPassword } from '@/server/utils/password';
import { requireAdminPermission } from '@/server/utils/require-permission';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { contract } from '../contracts';
import {
  buildTypedIncludes,
  createIncludeMap,
} from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';

// ============================================
// CONFIG
// ============================================

type ApiClientColumn = keyof typeof apiClients.$inferSelect;

const API_CLIENT_FIELDS: FieldMap = {
  id: apiClients.id,
  name: apiClients.name,
  clientId: apiClients.clientId,
  status: apiClients.status,
  accessTokenExp: apiClients.accessTokenExp,
  lastUsedAt: apiClients.lastUsedAt,
  createdAt: apiClients.createdAt,
  updatedAt: apiClients.updatedAt,
} satisfies Partial<Record<ApiClientColumn, (typeof apiClients)[ApiClientColumn]>>;

const API_CLIENT_QUERY_CONFIG: QueryConfig = {
  fields: API_CLIENT_FIELDS,
  searchFields: [apiClients.name, apiClients.clientId],
  defaultSort: { column: apiClients.createdAt, order: 'desc' },
};

const API_CLIENT_INCLUDES = createIncludeMap<typeof db.query.apiClients>()({
  roles: {
    relation: 'roles',
    config: {
      with: {
        role: {
          with: {
            application: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    },
  },
});

// Generate a cryptographically secure client secret (32 bytes = 256 bits)
function generateClientSecret(): string {
  return randomBytes(32).toString('base64url');
}

// Generate a unique client ID
function generateClientId(): string {
  return `cli_${randomUUID().replace(/-/g, '')}`;
}

// Remove sensitive fields from API client
function sanitizeApiClient<T extends { clientSecretHash?: string }>(
  client: T
): Omit<T, 'clientSecretHash'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clientSecretHash, ...safe } = client;
  return safe;
}

// ============================================
// HANDLER
// ============================================

export const apiClient = tsr.router(contract.apiClient, {
  // ==========================================
  // LIST - GET /api-clients
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
      } = buildQuery({ page, limit, search, where, sort }, API_CLIENT_QUERY_CONFIG);

      const whereWithAccount = whereClause
        ? and(whereClause, eq(apiClients.accountId, session.accountId))
        : eq(apiClients.accountId, session.accountId);

      const [data, countResult] = await Promise.all([
        db.query.apiClients.findMany({
          where: whereWithAccount,
          with: buildTypedIncludes(include, API_CLIENT_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(apiClients)
          .where(whereWithAccount),
      ]);

      return {
        status: 200 as const,
        body: {
          data: data.map(sanitizeApiClient),
          meta: buildPaginationMeta(countResult[0]?.count ?? 0, page, limit),
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, { genericMsg: 'Error al listar API Clients' });
    }
  },

  // ==========================================
  // GET - GET /api-clients/:id
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

      const client = await db.query.apiClients.findFirst({
        where: and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)),
        with: buildTypedIncludes(query?.include, API_CLIENT_INCLUDES),
      });

      if (!client) {
        return {
          status: 404,
          body: { message: 'API Client not found', code: 'API_CLIENT_NOT_FOUND' },
        };
      }

      return { status: 200, body: sanitizeApiClient(client) };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al obtener API Client ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /api-clients
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

      const { roleIds, ...data } = body;

      // Generate credentials
      const clientId = generateClientId();
      const clientSecret = generateClientSecret();
      const clientSecretHash = await hashPassword(clientSecret);

      const created = await db.transaction(async (tx) => {
        const [newClient] = await tx
          .insert(apiClients)
          .values({
            ...data,
            accountId: session.accountId,
            clientId,
            clientSecretHash,
            accessTokenExp: data.accessTokenExp ?? 600, // Default 10 minutes
          })
          .returning();

        if (roleIds && roleIds.length > 0) {
          await tx.insert(apiClientRoles).values(
            roleIds.map((roleId) => ({
              apiClientId: newClient.id,
              roleId,
            }))
          );
        }

        return newClient;
      });

      // Return with plain text secret (only time it's returned)
      const { clientSecretHash: _, ...safeClient } = created;
      return {
        status: 201 as const,
        body: { ...safeClient, clientSecret },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error al crear API Client',
      });
    }
  },

  // ==========================================
  // UPDATE - PATCH /api-clients/:id
  // ==========================================
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

      const existing = await db.query.apiClients.findFirst({
        where: and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)),
      });

      if (!existing) {
        return {
          status: 404,
          body: { message: 'API Client not found', code: 'API_CLIENT_NOT_FOUND' },
        };
      }

      const { roleIds, ...data } = body;

      const updated = await db.transaction(async (tx) => {
        const [updatedClient] = await tx
          .update(apiClients)
          .set(data)
          .where(and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)))
          .returning();

        if (roleIds !== undefined) {
          if (roleIds.length > 0) {
            await tx
              .insert(apiClientRoles)
              .values(
                roleIds.map((roleId) => ({
                  apiClientId: id,
                  roleId,
                }))
              )
              .onConflictDoNothing();
          }
          // Remove roles not in the new list
          if (roleIds.length === 0) {
            await tx.delete(apiClientRoles).where(eq(apiClientRoles.apiClientId, id));
          } else {
            await tx
              .delete(apiClientRoles)
              .where(
                and(
                  eq(apiClientRoles.apiClientId, id),
                  notInArray(apiClientRoles.roleId, roleIds)
                )
              );
          }
        }

        return updatedClient;
      });

      return { status: 200, body: sanitizeApiClient(updated) };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al actualizar API Client ${id}`,
      });
    }
  },

  // ==========================================
  // DELETE - DELETE /api-clients/:id
  // ==========================================
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

      const existing = await db.query.apiClients.findFirst({
        where: and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)),
      });

      if (!existing) {
        return {
          status: 404,
          body: { message: 'API Client not found', code: 'API_CLIENT_NOT_FOUND' },
        };
      }

      const [deleted] = await db
        .delete(apiClients)
        .where(and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)))
        .returning();

      return { status: 200, body: sanitizeApiClient(deleted) };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al eliminar API Client ${id}`,
      });
    }
  },

  // ==========================================
  // REGENERATE SECRET - POST /api-clients/:id/regenerate-secret
  // ==========================================
  regenerateSecret: async ({ params: { id } }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.apiClients.findFirst({
        where: and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)),
      });

      if (!existing) {
        return {
          status: 404,
          body: { message: 'API Client not found', code: 'API_CLIENT_NOT_FOUND' },
        };
      }

      // Generate new secret
      const clientSecret = generateClientSecret();
      const clientSecretHash = await hashPassword(clientSecret);

      await db
        .update(apiClients)
        .set({ clientSecretHash })
        .where(and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)));

      return {
        status: 200,
        body: { clientSecret },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al regenerar secret para API Client ${id}`,
      });
    }
  },

  // ==========================================
  // SUSPEND - POST /api-clients/:id/suspend
  // ==========================================
  suspend: async ({ params: { id } }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.apiClients.findFirst({
        where: and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)),
      });

      if (!existing) {
        return {
          status: 404,
          body: { message: 'API Client not found', code: 'API_CLIENT_NOT_FOUND' },
        };
      }

      const [updated] = await db
        .update(apiClients)
        .set({ status: 'suspended' })
        .where(and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)))
        .returning();

      return { status: 200, body: sanitizeApiClient(updated) };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al suspender API Client ${id}`,
      });
    }
  },

  // ==========================================
  // ACTIVATE - POST /api-clients/:id/activate
  // ==========================================
  activate: async ({ params: { id } }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const existing = await db.query.apiClients.findFirst({
        where: and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)),
      });

      if (!existing) {
        return {
          status: 404,
          body: { message: 'API Client not found', code: 'API_CLIENT_NOT_FOUND' },
        };
      }

      const [updated] = await db
        .update(apiClients)
        .set({ status: 'active' })
        .where(and(eq(apiClients.id, id), eq(apiClients.accountId, session.accountId)))
        .returning();

      return { status: 200, body: sanitizeApiClient(updated) };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error al activar API Client ${id}`,
      });
    }
  },
});
