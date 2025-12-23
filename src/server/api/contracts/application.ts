import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import {
  CreateApplicationBodySchema,
  GetApplicationQuerySchema,
  ListApplicationsQuerySchema,
  UpdateApplicationBodySchema,
} from '@/schemas/application';
import { Application } from '@/server/db/schema';
import { Paginated } from '@/server/utils/query/schemas';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const application = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListApplicationsQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'applications:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<Application>>(),
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
      query: GetApplicationQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'applications:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Application>(),
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
      body: CreateApplicationBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'applications:create',
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<Application>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        409: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    update: {
      method: 'PATCH',
      path: '/:id',
      pathParams: IdParamSchema,
      body: UpdateApplicationBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'applications:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Application>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    delete: {
      method: 'DELETE',
      path: '/:id',
      pathParams: IdParamSchema,
      body: c.noBody(),
      metadata: {
        auth: 'required',
        permissionKey: 'applications:delete',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Application>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/applications' }
);
