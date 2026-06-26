import { z } from 'zod';
import { PROJECT_STATUS } from './common.schema.js';

export const createProjectSchema = z.object({
  projectName: z.string().trim().min(1, 'Project name is required').max(100, 'Max 100 characters'),
  description: z.string().trim().max(500, 'Max 500 characters').optional().default(''),
  status: z.enum(PROJECT_STATUS).default('active'),
});

// All fields optional on edit, but at least keep validation rules.
export const updateProjectSchema = z.object({
  projectName: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  status: z.enum(PROJECT_STATUS).optional(),
});
