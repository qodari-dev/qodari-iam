import { z } from 'zod';

// ============================================
// PARAMS
// ============================================

export const IdParamSchema = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof IdParamSchema>;

export const booleanOptions = [
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
] as const;
