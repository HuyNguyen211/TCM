import { z } from 'zod';

/** POST /api/team/members — add a tester to the current lead's team. */
export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});
