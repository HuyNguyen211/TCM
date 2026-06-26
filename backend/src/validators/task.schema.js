import { z } from 'zod';
import { TASK_STATUS } from './common.schema.js';

const emailOrEmpty = z.string().trim().email('Must be a valid email').or(z.literal('')).optional().default('');

const urlOrEmpty = z.string().trim().url('Must be a valid URL').or(z.literal('')).optional().default('');

export const createTaskSchema = z.object({
  taskName: z.string().trim().min(1, 'Task name is required').max(200, 'Max 200 characters'),
  description: z.string().trim().max(1000, 'Max 1000 characters').optional().default(''),
  status: z.enum(TASK_STATUS).default('To Do'),
  assignee: emailOrEmpty,
  jiraKey: z.string().trim().max(120).optional().default(''),
  confluenceUrl: urlOrEmpty,
  figmaUrl: urlOrEmpty,
});

export const updateTaskSchema = z.object({
  taskName: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(TASK_STATUS).optional(),
  assignee: z.string().trim().email().or(z.literal('')).optional(),
  jiraKey: z.string().trim().max(120).optional(),
  confluenceUrl: z.string().trim().url().or(z.literal('')).optional(),
  figmaUrl: z.string().trim().url().or(z.literal('')).optional(),
});
