import { z } from 'zod';

export const createSuiteSchema = z.object({
  suiteName: z.string().trim().min(1, 'Suite name is required').max(150, 'Max 150 characters'),
  testCaseIds: z.array(z.string()).optional().default([]),
});
