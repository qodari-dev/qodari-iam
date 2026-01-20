import { eq } from 'drizzle-orm';
import { db } from '../db';
import { apiClientRoles } from '../db/schema';

export async function getApiClientRolesAndPermissions(opts: {
  apiClientId: string;
  applicationId: string;
}) {
  const { apiClientId, applicationId } = opts;

  const clientRoles = await db.query.apiClientRoles.findMany({
    where: eq(apiClientRoles.apiClientId, apiClientId),
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

  for (const cr of clientRoles) {
    const role = cr.role;
    if (!role) continue;
    // Only include roles that belong to the requested application
    if (role.applicationId !== applicationId) continue;

    // roles
    roleSlugs.add(role.slug);

    // permissions (resource:action)
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
