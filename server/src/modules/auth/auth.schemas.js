import { z } from 'zod';

// Students log in with studentCode, staff with username - exactly one of the two, never both.
export const loginSchema = z
  .object({
    studentCode: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((data) => Boolean(data.studentCode) !== Boolean(data.username), {
    message: 'Provide either studentCode or username, not both',
    path: ['studentCode'],
  });
