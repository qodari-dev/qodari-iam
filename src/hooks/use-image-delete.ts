import { useCallback } from 'react';
import { api } from '@/clients/api';
import { toast } from 'sonner';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';

export function useImageDelete() {
  const { mutateAsync: deleteMutation, isPending } = api.upload.delete.useMutation({
    onError: (error) => {
      toast.error(getTsRestErrorMessage(error));
    },
  });

  const deleteUpload = useCallback(
    async (key: string): Promise<boolean> => {
      try {
        if (!key.startsWith('public/temp/logos/')) {
          return false;
        }

        const result = await deleteMutation({ body: { key } });

        if (result.status === 200) {
          return true;
        }

        return false;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Delete failed';
        toast.error(message);
        return false;
      }
    },
    [deleteMutation]
  );

  return {
    deleteUpload,
    isDeleting: isPending,
  };
}
