import { z } from 'zod';

export const UpdateAccountBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logo: z.string().nullable().optional(),
  imageAd: z.string().nullable().optional(),
});

export type UpdateAccountBody = z.infer<typeof UpdateAccountBodySchema>;
