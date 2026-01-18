'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useImageUpload } from '@/hooks/use-image-upload';
import { getStorageUrl } from '@/utils/storage';
import { ImagePlus, Loader2, X } from 'lucide-react';
import Image from 'next/image';

type ImageUploadProps = {
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

export function ImageUpload({ value, onChange, disabled, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { upload, isUploading, progress, error, reset } = useImageUpload();

  const imageUrl = previewUrl || getStorageUrl(value);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return;
      }

      // Create a local preview
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Upload the file
      const key = await upload(file);

      // Cleanup preview
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);

      if (key) {
        onChange?.(key);
      }
    },
    [upload, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, isUploading, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFile]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(null);
      reset();
    },
    [onChange, reset]
  );

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || isUploading}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-input relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'cursor-not-allowed opacity-50',
          isUploading && 'cursor-wait'
        )}
      >
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt="Preview"
              fill
              className="rounded-lg object-cover"
              unoptimized
            />
            {!disabled && !isUploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-1 shadow-md"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <ImagePlus className="h-8 w-8" />
            <span className="text-xs">Click or drop</span>
          </div>
        )}

        {isUploading && (
          <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center rounded-lg">
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
            <span className="text-muted-foreground mt-1 text-xs">{progress}%</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-destructive mt-1 text-xs">
          {error} - {value}
        </p>
      )}
    </div>
  );
}
