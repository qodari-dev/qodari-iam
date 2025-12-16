import { z } from 'zod';

// ============================================
// PARAMS
// ============================================

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof IdParamSchema>;
