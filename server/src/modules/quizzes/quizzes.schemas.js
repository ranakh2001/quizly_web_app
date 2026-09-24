import { z } from 'zod';
import {
  OPTIONS_PER_QUESTION,
  DEFAULT_TIME_LIMIT_MIN,
  DEFAULT_PENALTY_RATIO,
} from '../../constants.js';

const isoDateTime = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: 'Must be a valid ISO 8601 date-time',
});

export const quizIdParamsSchema = z.object({
  quizId: z.coerce.number().int().positive(),
});

export const questionParamsSchema = z.object({
  quizId: z.coerce.number().int().positive(),
  questionId: z.coerce.number().int().positive(),
});

export const createQuizSchema = z
  .object({
    title: z.string().trim().min(1),
    language: z.enum(['ar', 'en']),
    timeLimitMinutes: z.coerce.number().int().positive().default(DEFAULT_TIME_LIMIT_MIN),
    opensAt: isoDateTime,
    closesAt: isoDateTime,
    classIds: z.array(z.coerce.number().int().positive()).default([]),
    negativeMarking: z.boolean().default(false),
    penaltyRatio: z.coerce.number().min(0).max(1).default(DEFAULT_PENALTY_RATIO),
  })
  .refine((data) => new Date(data.opensAt).getTime() < new Date(data.closesAt).getTime(), {
    message: 'opensAt must be before closesAt',
    path: ['closesAt'],
  });

// All fields optional: a full edit sends everything, a locked quiz sends only title/closesAt.
// Which fields are actually allowed is a rule 11 business decision, enforced in the service.
export const updateQuizSchema = z.object({
  title: z.string().trim().min(1).optional(),
  language: z.enum(['ar', 'en']).optional(),
  timeLimitMinutes: z.coerce.number().int().positive().optional(),
  opensAt: isoDateTime.optional(),
  closesAt: isoDateTime.optional(),
  classIds: z.array(z.coerce.number().int().positive()).optional(),
  negativeMarking: z.boolean().optional(),
  penaltyRatio: z.coerce.number().min(0).max(1).optional(),
});

const optionInputSchema = z.object({
  text: z.string().trim().min(1),
  isCorrect: z.boolean(),
});

export const questionInputSchema = z
  .object({
    text: z.string().trim().min(1),
    points: z.coerce.number().int().positive(),
    options: z.array(optionInputSchema).length(OPTIONS_PER_QUESTION),
  })
  .refine((data) => data.options.filter((option) => option.isCorrect).length === 1, {
    message: 'Exactly one option must be marked correct',
    path: ['options'],
  });

export const resultsQuerySchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
});
