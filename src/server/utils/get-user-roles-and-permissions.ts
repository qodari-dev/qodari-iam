import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { userRoles } from '../db/schema';

export async function getUserRolesAndPermissions(opts: {
  userId: string;
  accountId: string;
  applicationId: string;
}) {
  const { userId, accountId, applicationId } = opts;

  const userRolesForAccount = await db.query.userRoles.findMany({
    where: and(eq(userRoles.userId, userId), eq(userRoles.accountId, accountId)),
    with: {
      role: {
        with: {
          rolePermissions: {
            with: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const roleSlugs = new Set<string>();
  const permSet = new Set<string>();

  for (const ur of userRolesForAccount) {
    const role = ur.role;
    if (!role) continue;
    if (role.applicationId !== applicationId) continue;

    // roles
    roleSlugs.add(role.slug);

    // permisos (resource:action)
    for (const rp of role.rolePermissions ?? []) {
      const p = rp.permission;
      if (!p) continue;
      permSet.add(`${p.resource}:${p.action}`);
    }
  }

  return {
    roles: Array.from(roleSlugs),
    permissions: Array.from(permSet),
  };
}
