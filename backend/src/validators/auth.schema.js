import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  // Optional display role; defaults to 'tester'. (Dev auth only.)
  role: z.enum(['admin', 'lead', 'tester', 'viewer']).optional().default('tester'),
});
