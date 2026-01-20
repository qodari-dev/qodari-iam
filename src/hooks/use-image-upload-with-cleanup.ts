import { useRef, useCallback, useEffect } from 'react';
import { useImageDelete } from './use-image-delete';

type UploadedKey = {
  key: string;
  savedToDb: boolean;
};

/**
 * Hook that tracks uploaded image keys and provides cleanup on unmount.
 * Use this hook to clean up orphaned images when:
 * - User uploads an image but doesn't save the form
 * - User changes an image before saving (old image becomes orphaned)
 * - User removes an image before saving
 */
export function useImageUploadWithCleanup() {
  const { deleteUpload } = useImageDelete();
  const uploadedKeysRef = useRef<Map<string, UploadedKey>>(new Map());

  /**
   * Called when a new image is uploaded.
   * Tracks the key for potential cleanup.
   */
  const onUploadComplete = useCallback((key: string) => {
    uploadedKeysRef.current.set(key, { key, savedToDb: false });
  }, []);

  /**
   * Called when an image is removed from the form (before saving).
   * Immediately deletes the image if it was uploaded in this session.
   */
  const onRemoveUnsaved = useCallback(
    async (key: string | null) => {
      if (!key) return;

      const tracked = uploadedKeysRef.current.get(key);
      if (tracked && !tracked.savedToDb) {
        uploadedKeysRef.current.delete(key);
        await deleteUpload(key);
      }
    },
    [deleteUpload]
  );

  /**
   * Called when the form is successfully saved.
   * Marks all tracked keys as saved so they won't be deleted on unmount.
   */
  const markAsSaved = useCallback((keys: (string | null | undefined)[]) => {
    for (const key of keys) {
      if (key && uploadedKeysRef.current.has(key)) {
        uploadedKeysRef.current.set(key, { key, savedToDb: true });
      }
    }
  }, []);

  /**
   * Clears all tracked keys.
   * Call this after form reset or when navigating away with confirmed save.
   */
  const clearTracked = useCallback(() => {
    uploadedKeysRef.current.clear();
  }, []);

  // Cleanup unsaved uploads on unmount
  useEffect(() => {
    const uploadedKeys = uploadedKeysRef.current;

    return () => {
      // Delete any uploads that weren't saved
      const unsavedKeys = Array.from(uploadedKeys.values())
        .filter((tracked) => !tracked.savedToDb)
        .map((tracked) => tracked.key);

      for (const key of unsavedKeys) {
        deleteUpload(key).catch((error) => {
          console.error('Failed to cleanup orphaned upload:', error);
        });
      }
    };
  }, [deleteUpload]);

  return {
    onUploadComplete,
    onRemoveUnsaved,
    markAsSaved,
    clearTracked,
  };
}
