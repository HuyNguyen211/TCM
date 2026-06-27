import { z } from 'zod';

// Admins may assign any role (unlike self-service signup).
export const ROLES = ['admin', 'lead', 'tester', 'viewer'];

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long');

/** POST /api/users — admin creates an account. */
export const adminCreateUserSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: passwordField,
  name: z.string().trim().min(1, 'Name is required').max(80).optional().default(''),
  role: z.enum(ROLES).default('tester'),
});

/** PATCH /api/users/:userId — admin updates name and/or role. */
export const adminUpdateUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(80).optional(),
    role: z.enum(ROLES).optional(),
  })
  .refine((d) => d.name !== undefined || d.role !== undefined, {
    message: 'Provide a name or role to update',
  });

/** POST /api/users/:userId/password — admin resets a user's password. */
export const adminResetPasswordSchema = z.object({
  password: passwordField,
});
