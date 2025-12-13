import { TsRestErrorSchema, TsRestMetaData } from '@/schemas/ts-rest';
import type { User } from '@/server/db/schema';

import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const user = c.router(
  {
    findUnique: {
      method: 'GET',
      path: `/:id`,
      pathParams: z.object({ id: z.string() }),
      metadata: {
        auth: 'required',
        permissionKey: 'users:read',
      } satisfies TsRestMetaData,
      responses: {
        200: c.type<User>(),
        400: TsRestErrorSchema,
        401: TsRestErrorSchema,
        403: TsRestErrorSchema,
        404: TsRestErrorSchema,
        429: TsRestErrorSchema,
        500: TsRestErrorSchema,
      },
    },
  },
  { pathPrefix: '/users' }
);
