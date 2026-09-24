import { z } from 'zod';

// Files are uploaded as base64 inside JSON (no multipart dependency needed for files this
// small - a school's student/teacher roster is at most a few hundred rows).
export const uploadFileSchema = z.object({
  filename: z.string().trim().min(1),
  contentBase64: z.string().min(1),
});
