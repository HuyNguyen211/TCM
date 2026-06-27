import { z } from 'zod';

// Self-service signup may only create low-privilege accounts. Elevated roles
// (admin, lead) are granted by an admin via the User Management page / API.
const SELF_SIGNUP_ROLES = ['tester', 'viewer'];

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long');

/** POST /api/auth/signup — create an account with email + password. */
export const signupSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: passwordField,
  name: z.string().trim().min(1, 'Name is required').max(80).optional().default(''),
  role: z.enum(SELF_SIGNUP_ROLES).optional().default('tester'),
});

/** POST /api/auth/login — authenticate with email + password. */
export const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});
