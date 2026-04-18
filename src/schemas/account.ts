import { z } from 'zod';

export const UpdateAccountBodySchema = z.object({
  name: z.string().min(1, 'ACCOUNT_NAME_REQUIRED').max(255, 'ACCOUNT_NAME_TOO_LONG').optional(),
  logo: z.string().nullable().optional(),
  imageAd: z.string().nullable().optional(),
});

export type UpdateAccountBody = z.infer<typeof UpdateAccountBodySchema>;
