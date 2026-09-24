import { z } from 'zod';

export const startAttemptSchema = z.object({
  quizId: z.coerce.number().int().positive(),
});

export const attemptIdParamsSchema = z.object({
  attemptId: z.coerce.number().int().positive(),
});

export const answerParamsSchema = z.object({
  attemptId: z.coerce.number().int().positive(),
  questionId: z.coerce.number().int().positive(),
});

export const saveAnswerSchema = z.object({
  optionId: z.coerce.number().int().positive(),
});
