import { z } from 'zod';

export const quizIdParamsSchema = z.object({
  quizId: z.coerce.number().int().positive(),
});
