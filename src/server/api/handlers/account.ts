import { db } from '@/server/db';
import { accounts } from '@/server/db/schema';
import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { requireAdminPermission } from '@/server/utils/require-permission';
import { deleteObject, isStorageKey } from '@/server/utils/spaces';
import { logAudit } from '@/server/utils/audit-logger';
import { getClientIp } from '@/server/utils/get-client-ip';
import { UnifiedAuthContext } from '@/server/utils/auth-context';
import { tsr } from '@ts-rest/serverless/next';
import { eq } from 'drizzle-orm';
import { contract } from '../contracts';

export const account = tsr.router(contract.account, {
  get: async ({}, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const acc = await db.query.accounts.findFirst({
        where: eq(accounts.id, session.accountId),
      });

      if (!acc) {
        return { status: 404, body: { message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' } };
      }

      return { status: 200, body: acc };
    } catch (e) {
      return genericTsRestErrorResponse(e, { genericMsg: 'Error getting account' });
    }
  },

  update: async ({ body }, { request, appRoute, nextRequest }) => {
    let session: UnifiedAuthContext | undefined;
    const ipAddress = getClientIp(nextRequest);
    const userAgent = nextRequest.headers.get('user-agent');
    try {
      session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const acc = await db.query.accounts.findFirst({
        where: eq(accounts.id, session.accountId),
      });

      if (!acc) {
        throwHttpError({
          status: 404,
          message: 'Account not found',
          code: 'ACCOUNT_NOT_FOUND',
        });
      }

      // Check if we need to delete old images
      const oldLogoKey = acc.logo;
      const oldImageAdKey = acc.imageAd;
      const shouldDeleteOldLogo =
        oldLogoKey &&
        isStorageKey(oldLogoKey) &&
        body.logo !== undefined &&
        body.logo !== oldLogoKey;
      const shouldDeleteOldImageAd =
        oldImageAdKey &&
        isStorageKey(oldImageAdKey) &&
        body.imageAd !== undefined &&
        body.imageAd !== oldImageAdKey;

      const [updated] = await db
        .update(accounts)
        .set({ ...body })
        .where(eq(accounts.id, session.accountId))
        .returning();

      // Delete old images from storage after successful update
      if (shouldDeleteOldLogo) {
        try {
          await deleteObject(oldLogoKey);
        } catch {
          console.error(`Failed to delete old logo: ${oldLogoKey}`);
        }
      }
      if (shouldDeleteOldImageAd) {
        try {
          await deleteObject(oldImageAdKey);
        } catch {
          console.error(`Failed to delete old imageAd: ${oldImageAdKey}`);
        }
      }

      logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: acc.id,
        resourceLabel: acc.name,
        status: 'success',
        beforeValue: {
          ...acc,
        },
        afterValue: {
          ...updated,
        },
        ipAddress,
        userAgent,
      });
      return { status: 200, body: updated };
    } catch (e) {
      const error = genericTsRestErrorResponse(e, { genericMsg: 'Error updating account' });
      await logAudit(session, {
        resourceKey: appRoute.metadata.permissionKey.resourceKey,
        actionKey: appRoute.metadata.permissionKey.actionKey,
        action: 'update',
        functionName: 'update',
        resourceId: session?.accountId,
        status: 'failure',
        errorMessage: error?.body.message,
        metadata: {
          body,
        },
        ipAddress,
        userAgent,
      });
      return error;
    }
  },
});
