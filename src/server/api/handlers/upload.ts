import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { requireAdminPermission } from '@/server/utils/require-permission';
import { generatePresignedUploadUrl } from '@/server/utils/spaces';
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
});
