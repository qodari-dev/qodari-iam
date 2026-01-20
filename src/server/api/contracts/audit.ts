import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import {
  CreateAuditLogBodySchema,
  GetAuditLogQuerySchema,
  ListAuditLogsQuerySchema,
  AuditLogExportQuerySchema,
} from '@/schemas/audit';
import { AuditLog } from '@/server/db/schema';
import { Paginated } from '@/server/utils/query/schemas';

import { initContract } from '@ts-rest/core';

const c = initContract();

export const audit = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListAuditLogsQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'audit:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<AuditLog>>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    getById: {
      method: 'GET',
      path: '/:id',
      pathParams: IdParamSchema,
      query: GetAuditLogQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'audit:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<AuditLog>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    create: {
      method: 'POST',
      path: '/',
      body: CreateAuditLogBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'audit:create',
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<AuditLog>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    export: {
      method: 'GET',
      path: '/export',
      query: AuditLogExportQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'audit:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<string>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/audit' }
);
