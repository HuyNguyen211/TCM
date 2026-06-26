import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { initDb } from './db/index.js';
import { requireAuth } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '1mb' }));

// Health check (no auth) — handy for Railway/Render probes.
app.get('/api/health', (req, res) => res.json({ ok: true, mode: env.DB_MODE }));

// Public auth routes
app.use('/api/auth', authRoutes);

// Everything else requires a valid JWT.
app.use('/api/projects', requireAuth, projectsRoutes);
app.use('/api/integrations', requireAuth, integrationsRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await initDb();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] TCM API listening on http://localhost:${env.PORT} (DB_MODE=${env.DB_MODE})`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start:', err);
  process.exit(1);
});

export default app;
