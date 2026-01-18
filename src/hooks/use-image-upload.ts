import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { api } from '@/clients/api';

type UploadState = {
  isUploading: boolean;
  progress: number;
  error: string | null;
};

type UploadOptions = {
  folder?: 'public/temp/logos';
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
};

const DEFAULT_OPTIONS: Required<UploadOptions> = {
  folder: 'public/temp/logos',
  maxSizeMB: 0.1, // 100KB
  maxWidthOrHeight: 512,
};

export function useImageUpload(options?: UploadOptions) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const presignMutation = api.upload.presign.useMutation();

  const opts = { ...DEFAULT_OPTIONS, ...options };

  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      // Don't compress SVGs
      if (file.type === 'image/svg+xml') {
        return file;
      }

      const compressed = await imageCompression(file, {
        maxSizeMB: opts.maxSizeMB,
        maxWidthOrHeight: opts.maxWidthOrHeight,
        useWebWorker: true,
        fileType: 'image/webp',
      });

      // Return as WebP with corrected name
      const name = file.name.replace(/\.[^.]+$/, '.webp');
      return new File([compressed], name, { type: 'image/webp' });
    },
    [opts.maxSizeMB, opts.maxWidthOrHeight]
  );

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setState({ isUploading: true, progress: 0, error: null });

      try {
        // Step 1: Compress the image
        setState((s) => ({ ...s, progress: 10 }));
        const compressedFile = await compressImage(file);

        // Step 2: Get presigned URL
        setState((s) => ({ ...s, progress: 30 }));
        const presignResult = await presignMutation.mutateAsync({
          body: {
            fileName: compressedFile.name,
            fileType: compressedFile.type as
              | 'image/jpeg'
              | 'image/png'
              | 'image/webp'
              | 'image/svg+xml',
            fileSize: compressedFile.size,
            folder: opts.folder,
          },
        });

        if (presignResult.status !== 200) {
          throw new Error('Failed to get presigned URL');
        }

        const { uploadUrl, key } = presignResult.body;

        // Step 3: Upload to Spaces
        setState((s) => ({ ...s, progress: 50 }));
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: compressedFile,
          headers: {
            'Content-Type': compressedFile.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        setState({ isUploading: false, progress: 100, error: null });
        return key;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        setState({ isUploading: false, progress: 0, error: message });
        return null;
      }
    },
    [compressImage, presignMutation, opts.folder]
  );

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return {
    upload,
    reset,
    ...state,
  };
}
