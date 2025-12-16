import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import {
  CreateUserBodySchema,
  GetUserQuerySchema,
  ListUsersQuerySchema,
  SetUserPasswordBodySchema,
  UpdateUserBodySchema,
} from '@/schemas/user';
import { SafeUser } from '@/server/db/schema';
import { Paginated } from '@/server/utils/query/schemas';

import { initContract } from '@ts-rest/core';

const c = initContract();

export const user = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListUsersQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'users:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<SafeUser>>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    getById: {
      method: 'GET',
      path: `/:id`,
      pathParams: IdParamSchema,
      query: GetUserQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'users:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeUser>(),
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
      body: CreateUserBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'users:create',
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<SafeUser>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        409: TsRestErrorSchema, // Email ya existe
        500: TsRestErrorSchema,
      },
    },
    update: {
      method: 'PATCH',
      path: '/:id',
      summary: 'Actualizar usuario',
      pathParams: IdParamSchema,
      body: UpdateUserBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'users:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeUser>(),
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
        permissionKey: 'users:delete',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeUser>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    setPassword: {
      method: 'POST',
      path: '/:id/set-password',
      pathParams: IdParamSchema,
      body: SetUserPasswordBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'users:update',
      } satisfies TsRestMetaData,
      responses: {
        204: c.noBody(),
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
        permissionKey: 'users:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeUser>(),
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
        permissionKey: 'users:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeUser>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    unlock: {
      method: 'POST',
      path: '/:id/unlock',
      pathParams: IdParamSchema,
      body: c.noBody(),
      metadata: {
        auth: 'required',
        permissionKey: 'users:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<SafeUser>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/users' }
);
