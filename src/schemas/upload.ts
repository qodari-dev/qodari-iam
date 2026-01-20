import { z } from 'zod';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'] as const;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const PresignUploadBodySchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(ALLOWED_IMAGE_TYPES, {
    errorMap: () => ({
      message: `File type must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    }),
  }),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, {
      message: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }),
  folder: z.enum(['public/temp/logos']).default('public/temp/logos'),
});

export const PresignUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
});

export const DeleteUploadBodySchema = z.object({
  key: z.string().min(1).refine(
    (key) => key.startsWith('public/temp/logos/'),
    { message: 'Only temporary uploads can be deleted' }
  ),
});

export type PresignUploadBody = z.infer<typeof PresignUploadBodySchema>;
export type PresignUploadResponse = z.infer<typeof PresignUploadResponseSchema>;
export type DeleteUploadBody = z.infer<typeof DeleteUploadBodySchema>;
