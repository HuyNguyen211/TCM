import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { atlassian } from '../integrations/atlassian.js';
import { figma } from '../integrations/figma.js';
import { isConfigured as aiConfigured, authMode as aiAuthMode } from '../services/aiGen.js';
import { env } from '../config/env.js';

const router = Router();

/** Probe a service: not-configured vs ok vs error — never throws. */
async function probe(svc) {
  if (!svc.isConfigured()) {
    return { configured: false, ok: false, message: 'Not configured — add credentials to backend/.env' };
  }
  try {
    const user = await svc.ping();
    return { configured: true, ok: true, user };
  } catch (err) {
    return { configured: true, ok: false, error: err.message };
  }
}

/** GET /api/integrations/status -> connectivity of Atlassian + Figma. */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const [atlassianStatus, figmaStatus] = await Promise.all([probe(atlassian), probe(figma)]);
    // AI: report config only (no live call to avoid token spend).
    const ai = aiConfigured()
      ? { configured: true, ok: true, model: env.ANTHROPIC_MODEL, authMode: aiAuthMode() }
      : { configured: false, ok: false, message: 'Not configured — add ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN to backend/.env' };
    res.json({ atlassian: atlassianStatus, figma: figmaStatus, ai });
  })
);

/** GET /api/integrations/jira/:issueKey -> a Jira issue (future task<->Jira sync). */
router.get(
  '/jira/:issueKey',
  asyncHandler(async (req, res) => {
    res.json(await atlassian.getIssue(req.params.issueKey));
  })
);

/** GET /api/integrations/figma/:fileKey -> Figma file metadata (key or full URL). */
router.get(
  '/figma/:fileKey',
  asyncHandler(async (req, res) => {
    res.json(await figma.getFile(req.params.fileKey));
  })
);

export default router;
