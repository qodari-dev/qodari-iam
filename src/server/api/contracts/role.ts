import {
  CreateRoleBodySchema,
  GetRoleQuerySchema,
  ListRolesQuerySchema,
  UpdateRoleBodySchema,
} from '@/schemas/role';
import { IdParamSchema } from '@/schemas/shared';
import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { Role } from '@/server/db/schema';
import { Paginated } from '@/server/utils/query/schemas';

import { initContract } from '@ts-rest/core';

const c = initContract();

export const role = c.router(
  {
    list: {
      method: 'GET',
      path: '/',
      query: ListRolesQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'roles:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Paginated<Role>>(),
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
      query: GetRoleQuerySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'roles:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Role>(),
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
      body: CreateRoleBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'users:create',
      } satisfies TsRestMetaData,
      responses: {
        201: c.type<Role>(),
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
      body: UpdateRoleBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'users:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Role>(),
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
        200: c.type<Role>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/roles' }
);
