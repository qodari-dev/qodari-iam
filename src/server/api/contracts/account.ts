import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import { UpdateAccountBodySchema } from '@/schemas/account';
import { Account } from '@/server/db/schema';
import { initContract } from '@ts-rest/core';

const c = initContract();

export const account = c.router(
  {
    get: {
      method: 'GET',
      path: '/',
      metadata: {
        auth: 'required',
        permissionKey: 'accounts:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Account>(),
        401: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
    update: {
      method: 'PATCH',
      path: '/',
      body: UpdateAccountBodySchema,
      metadata: {
        auth: 'required',
        permissionKey: 'accounts:update',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<Account>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/account' }
);
