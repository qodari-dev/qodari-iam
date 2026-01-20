import {
  CreateApiClientBodySchema,
  GetApiClientQuerySchema,
  ListApiClientsQuerySchema,
  RegenerateSecretResponseSchema,
  UpdateApiClientBodySchema,
} from '@/schemas/api-client';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { ApiClient } from '@/server/db/schema';
import { Paginated } from '@/server/utils/query/schemas';
import { initContract } from '@ts-rest/core';

const c = initContract();

// Safe API Client type without clientSecretHash
type SafeApiClient = Omit<ApiClient, 'clientSecretHash'>;

// Response with secret (only on create/regenerate)
type ApiClientWithSecret = SafeApiClient & { clientSecret: string };

export const apiClient = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListApiClientsQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'api-clients:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<SafeApiClient>>(),
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
      query: GetApiClientQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'api-clients:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeApiClient>(),
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
      body: CreateApiClientBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'api-clients:create',
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<ApiClientWithSecret>(),
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
      body: UpdateApiClientBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'api-clients:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeApiClient>(),
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
        permissionKey: 'api-clients:delete',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeApiClient>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    regenerateSecret: {
      method: 'POST',
      path: '/:id/regenerate-secret',
      pathParams: IdParamSchema,
      body: c.noBody(),
      metadata: {
        auth: 'required',
        permissionKey: 'api-clients:update',
      } satisfies TsRestMetaData,
      responses: {
        200: RegenerateSecretResponseSchema,
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    suspend: {
      method: 'POST',
      path: '/:id/suspend',
      pathParams: IdParamSchema,
      body: c.noBody(),
      metadata: {
        auth: 'required',
        permissionKey: 'api-clients:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeApiClient>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    activate: {
      method: 'POST',
      path: '/:id/activate',
      pathParams: IdParamSchema,
      body: c.noBody(),
      metadata: {
        auth: 'required',
        permissionKey: 'api-clients:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeApiClient>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/api-clients' }
);
