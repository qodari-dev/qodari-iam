import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { requireAdminPermission } from '@/server/utils/require-permission';
import { generatePresignedUploadUrl, deleteObject } from '@/server/utils/spaces';
import { tsr } from '@ts-rest/serverless/next';
import { contract } from '../contracts';

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[mimeType] ?? 'bin';
}

/**
 * Extracts accountId from a storage key.
 * Key format: public/temp/logos/{accountId}/{uuid}.{ext}
 */
function extractAccountIdFromKey(key: string): string | null {
  const parts = key.split('/');
  // Expected: ['public', 'temp', 'logos', accountId, 'filename.ext']
  if (parts.length >= 4 && parts[0] === 'public' && parts[1] === 'temp' && parts[2] === 'logos') {
    return parts[3];
  }
  return null;
}

export const upload = tsr.router(contract.upload, {
  presign: async ({ body }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const { fileType, folder } = body;
      const ext = getExtensionFromMimeType(fileType);
      const uuid = crypto.randomUUID();
      const key = `${folder}/${session.accountId}/${uuid}.${ext}`;

      const uploadUrl = await generatePresignedUploadUrl(key, fileType);

      return {
        status: 200 as const,
        body: {
          uploadUrl,
          key,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, { genericMsg: 'Error generating presigned URL' });
    }
  },

  delete: async ({ body }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'Not authenticated',
          code: 'UNAUTHENTICATED',
        });
      }

      const { key } = body;

      // Security: Verify the key belongs to the user's account
      const keyAccountId = extractAccountIdFromKey(key);
      if (keyAccountId !== session.accountId) {
        throwHttpError({
          status: 403,
          message: 'You can only delete your own uploads',
          code: 'FORBIDDEN',
        });
      }

      await deleteObject(key);

      return {
        status: 200 as const,
        body: { success: true },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, { genericMsg: 'Error deleting upload' });
    }
  },
});
