import { z } from 'zod';
import { EXECUTION_STATUS } from './common.schema.js';

/**
 * Execution input. NOTE the API field is `executionStatus` (maps to sheet column E `status`).
 * failureReason is REQUIRED when executionStatus === 'FAILED'.
 */
export const createExecutionSchema = z
  .object({
    executionStatus: z.enum(EXECUTION_STATUS),
    failureReason: z.string().trim().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    duration: z.coerce.number().int().min(0).optional().default(0), // seconds
    evidenceUrls: z.array(z.string().url('Each evidence item must be a valid URL')).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.executionStatus === 'FAILED' && !(data.failureReason && data.failureReason.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['failureReason'],
        message: 'Failure reason is required when status is FAILED',
      });
    }
  });
