import { genericTsRestErrorResponse, throwHttpError } from '@/server/utils/generic-ts-rest-error';
import { requireAdminPermission } from '@/server/utils/require-permission';
import { generatePresignedUploadUrl, deleteObject } from '@/server/utils/spaces';
import {
  buildManagedUploadKey,
  extractAccountIdFromManagedStorageKey,
  isManagedStorageKey,
} from '@/server/utils/storage-paths';
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
          message: 'No autenticado',
          code: 'UNAUTHENTICATED',
        });
      }

      const { fileType, uploadType } = body;
      const ext = getExtensionFromMimeType(fileType);
      const uuid = crypto.randomUUID();

      const key = buildManagedUploadKey(session.accountId, uploadType, `${uuid}.${ext}`);

      const uploadUrl = await generatePresignedUploadUrl(key, fileType);

      return {
        status: 200 as const,
        body: {
          uploadUrl,
          key,
        },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, { genericMsg: 'Error al generar URL prefirmada' });
    }
  },

  delete: async ({ body }, { request, appRoute }) => {
    try {
      const session = await requireAdminPermission(request, appRoute.metadata);
      if (!session) {
        throwHttpError({
          status: 401,
          message: 'No autenticado',
          code: 'UNAUTHENTICATED',
        });
      }

      const { key } = body;

      if (!isManagedStorageKey(key)) {
        throwHttpError({
          status: 400,
          message: 'Clave de almacenamiento no valida',
          code: 'INVALID_UPLOAD_KEY',
        });
      }

      // Security: Verify the key belongs to the user's account
      const keyAccountId = extractAccountIdFromManagedStorageKey(key);
      if (keyAccountId !== session.accountId) {
        throwHttpError({
          status: 403,
          message: 'Solo puedes eliminar tus propias cargas',
          code: 'FORBIDDEN',
        });
      }

      await deleteObject(key);

      return {
        status: 200 as const,
        body: { success: true },
      };
    } catch (e) {
      return genericTsRestErrorResponse(e, { genericMsg: 'Error al eliminar la carga' });
    }
  },
});
