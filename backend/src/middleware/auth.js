/**
 * auth.js — JWT bearer auth.
 *
 * Dev mode issues a JWT from just an email (see routes/auth.routes.js). The token
 * carries { userId, email, role }. To swap in real Google OAuth later, replace the
 * login route's token issuance with OAuth verification — this middleware is unchanged.
 */
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing Bearer token' });
  }
  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

/**
 * Gate a route to specific roles. Mount AFTER requireAuth.
 * The role comes from the JWT, so role changes take effect on the user's next login.
 * Usage: app.use('/api/users', requireAuth, requireRole('admin'), usersRoutes)
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to perform this action' });
    }
    return next();
  };
}

/**
 * Read-open, write-gated: GET/HEAD pass for any authenticated user (so viewers can
 * read everything), while mutating methods (POST/PUT/PATCH/DELETE) require one of
 * `roles`. Mount on a whole router to gate all its writes at once.
 */
export function requireWriteRole(...roles) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Your role cannot modify this resource' });
    }
    return next();
  };
}
