import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { tsr } from '@ts-rest/serverless/next';
import { eq } from 'drizzle-orm';
import { contract } from '../contracts';
import { genericTsRestErrorResponse } from '@/server/utils/generic-ts-rest-error';
import { requireAdminPermission } from '@/server/utils/require-permission';

export const user = tsr.router(contract.user, {
  // --------------------------------------
  // GET - /users/{id}
  // --------------------------------------
  findUnique: async ({ params: { id } }, { request, appRoute }) => {
    try {
      await requireAdminPermission(request, appRoute.metadata);

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        return { status: 404, body: { message: `Unable to locate user with id (${id})` } };
      }

      return { status: 200, body: user };
    } catch (e) {
      return genericTsRestErrorResponse(e, {
        genericMsg: `Something went wrong getting user with id (${id}).`,
      });
    }
  },
});
