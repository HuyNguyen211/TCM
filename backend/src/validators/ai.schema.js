import { z } from 'zod';

export const genTestcasesSchema = z.object({
  sources: z.array(z.enum(['jira', 'confluence', 'figma'])).min(1, 'Chọn ít nhất 1 nguồn tài liệu'),
  count: z.coerce.number().int().min(1).max(20).optional().default(8),
  instructions: z.string().trim().max(1000).optional().default(''),
});
