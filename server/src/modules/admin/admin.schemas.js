import { z } from 'zod';

export const attemptIdParamsSchema = z.object({
  attemptId: z.coerce.number().int().positive(),
});

export const resetReasonSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required'),
});
