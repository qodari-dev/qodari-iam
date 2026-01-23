import { db } from '@/server/db';
import { auditLogs } from '@/server/db/schema';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { tsr } from '@ts-rest/serverless/next';
import { and, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { contract } from '../contracts';

import { buildTypedIncludes, createIncludeMap } from '@/server/utils/query/include-builder';
import {
  buildPaginationMeta,
  buildQuery,
  FieldMap,
  QueryConfig,
} from '@/server/utils/query/query-builder';
import { requireAdminPermission } from '@/server/utils/require-permission';

// ============================================
// CONFIG
// ============================================

type AuditLogColumn = keyof typeof auditLogs.$inferSelect;

const AUDIT_LOG_FIELDS: FieldMap = {
  id: auditLogs.id,
  actorType: auditLogs.actorType,
  userId: auditLogs.userId,
  apiClientId: auditLogs.apiClientId,
  applicationId: auditLogs.applicationId,
  action: auditLogs.action,
  resource: auditLogs.resource,
  resourceId: auditLogs.resourceId,
  status: auditLogs.status,
  createdAt: auditLogs.createdAt,
} satisfies Partial<Record<AuditLogColumn, (typeof auditLogs)[AuditLogColumn]>>;

const AUDIT_LOG_QUERY_CONFIG: QueryConfig = {
  fields: AUDIT_LOG_FIELDS,
  searchFields: [
    auditLogs.resourceLabel,
    auditLogs.userName,
    auditLogs.apiClientName,
    auditLogs.resource,
  ],
  defaultSort: { column: auditLogs.createdAt, order: 'desc' },
};

const AUDIT_LOG_INCLUDES = createIncludeMap<typeof db.query.auditLogs>()({
  user: {
    relation: 'user',
    config: {
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    },
  },
  apiClient: {
    relation: 'apiClient',
    config: {
      columns: {
        id: true,
        name: true,
      },
    },
  },
  application: {
    relation: 'application',
    config: {
      columns: {
        id: true,
        name: true,
        slug: true,
      },
    },
  },
});

// ============================================
// HANDLER
// ============================================

export const audit = tsr.router(contract.audit, {
  // ==========================================
  // LIST - GET /audit
  // ==========================================
  list: async ({ query }, { request, appRoute }) => {
    try {
      const ctx = await requireAdminPermission(request, appRoute.metadata);
      if (!ctx) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }
      const accountId = ctx.accountId;

      const { page, limit, search, where, sort, include } = query;

      const {
        whereClause,
        orderBy,
        limit: queryLimit,
        offset,
      } = buildQuery({ page, limit, search, where, sort }, AUDIT_LOG_QUERY_CONFIG);

      // Always filter by account
      const accountCondition = eq(auditLogs.accountId, accountId);
      const finalWhere = whereClause ? and(accountCondition, whereClause) : accountCondition;

      const [data, countResult] = await Promise.all([
        db.query.auditLogs.findMany({
          where: finalWhere,
          with: buildTypedIncludes(include, AUDIT_LOG_INCLUDES),
          orderBy: orderBy.length ? orderBy : undefined,
          limit: queryLimit,
          offset,
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(auditLogs)
          .where(finalWhere),
      ]);

      return {
        status: 200 as const,
        body: {
          data,
          meta: buildPaginationMeta(countResult[0]?.count ?? 0, page, limit),
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, { genericMsg: 'Error listing audit logs' });
    }
  },

  // ==========================================
  // GET - GET /audit/:id
  // ==========================================
  getById: async ({ params: { id }, query }, { request, appRoute }) => {
    try {
      const ctx = await requireAdminPermission(request, appRoute.metadata);
      if (!ctx) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }
      const accountId = ctx.accountId;

      const auditLog = await db.query.auditLogs.findFirst({
        where: and(eq(auditLogs.id, id), eq(auditLogs.accountId, accountId)),
        with: buildTypedIncludes(query?.include, AUDIT_LOG_INCLUDES),
      });

      if (!auditLog) {
        return {
          status: 404,
          body: { message: 'Audit log not found', code: 'AUDIT_LOG_NOT_FOUND' },
        };
      }

      return { status: 200, body: auditLog };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Error getting audit log ${id}`,
      });
    }
  },

  // ==========================================
  // CREATE - POST /audit (for M2M API clients)
  // ==========================================
  create: async ({ body }, { request, nextRequest, appRoute }) => {
    try {
      const ctx = await requireAdminPermission(request, appRoute.metadata);
      if (!ctx) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }
      const accountId = ctx.accountId;

      // Get IP and user agent from request
      const ipAddress =
        nextRequest?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        nextRequest?.headers.get('x-real-ip') ||
        null;
      const userAgent = nextRequest?.headers.get('user-agent') || null;

      let insertData: typeof auditLogs.$inferInsert;

      if (ctx.type === 'api_client') {
        // M2M context - API Client is creating the log
        insertData = {
          accountId,
          actorType: 'api_client',
          apiClientId: ctx.apiClientId,
          apiClientName: ctx.apiClientName,
          applicationId: ctx.applicationId,
          applicationName: ctx.applicationName,
          action: body.action,
          resource: body.resource,
          resourceId: body.resourceId,
          resourceLabel: body.resourceLabel,
          userId: body.userId,
          userName: body.userName,
          status: body.status,
          errorMessage: body.errorMessage,
          beforeValue: body.beforeValue,
          afterValue: body.afterValue,
          metadata: body.metadata,
          ipAddress,
          userAgent,
        };
      } else {
        // User context - User is creating the log (rare, but possible for internal use)
        insertData = {
          accountId,
          actorType: 'user',
          userId: ctx.user.id,
          userName: `${ctx.user.firstName} ${ctx.user.lastName}`,
          action: body.action,
          resource: body.resource,
          resourceId: body.resourceId,
          resourceLabel: body.resourceLabel,
          status: body.status,
          errorMessage: body.errorMessage,
          beforeValue: body.beforeValue,
          afterValue: body.afterValue,
          metadata: body.metadata,
          ipAddress,
          userAgent,
        };
      }

      const [newAuditLog] = await db.insert(auditLogs).values(insertData).returning();

      return { status: 201, body: newAuditLog };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error creating audit log',
      });
    }
  },

  // ==========================================
  // EXPORT - GET /audit/export
  // ==========================================
  export: async ({ query }, { request, appRoute }) => {
    try {
      const ctx = await requireAdminPermission(request, appRoute.metadata);
      if (!ctx) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }
      const accountId = ctx.accountId;

      const {
        format,
        actorType,
        userId,
        apiClientId,
        applicationId,
        action,
        status,
        from,
        to,
        search,
      } = query;

      // Build where conditions
      const conditions = [eq(auditLogs.accountId, accountId)];
      if (applicationId) conditions.push(eq(auditLogs.applicationId, applicationId));
      if (actorType) conditions.push(eq(auditLogs.actorType, actorType));
      if (userId) conditions.push(eq(auditLogs.userId, userId));
      if (apiClientId) conditions.push(eq(auditLogs.apiClientId, apiClientId));
      if (action) conditions.push(eq(auditLogs.action, action));
      if (from) conditions.push(gte(auditLogs.createdAt, from));
      if (to) conditions.push(lte(auditLogs.createdAt, to));
      if (status) conditions.push(eq(auditLogs.status, status));
      if (search) {
        conditions.push(
          or(
            ilike(auditLogs.resourceLabel, `%${search}%`),
            ilike(auditLogs.userName, `%${search}%`),
            ilike(auditLogs.apiClientName, `%${search}%`)
          )!
        );
      }

      const data = await db.query.auditLogs.findMany({
        where: and(...conditions),
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        limit: 10000, // Max export limit
      });

      if (format === 'json') {
        return {
          status: 200,
          body: JSON.stringify(data, null, 2),
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`,
          },
        };
      }

      // CSV format
      const headers = [
        'id',
        'createdAt',
        'actorType',
        'userName',
        'apiClientName',
        'applicationName',
        'action',
        'resource',
        'resourceId',
        'resourceLabel',
        'status',
        'errorMessage',
        'ipAddress',
        'beforeValue',
        'afterValue',
        'metadata',
      ];

      const escapeCSV = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          [
            row.id,
            row.createdAt.toISOString(),
            row.actorType,
            row.userName,
            row.apiClientName,
            row.applicationName,
            row.action,
            row.resource,
            row.resourceId,
            row.resourceLabel,
            row.status,
            row.errorMessage,
            row.ipAddress,
            row.beforeValue,
            row.afterValue,
            row.metadata,
          ]
            .map(escapeCSV)
            .join(',')
        ),
      ];

      return {
        status: 200,
        body: csvRows.join('\n'),
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: 'Error exporting audit logs',
      });
    }
  },
});
