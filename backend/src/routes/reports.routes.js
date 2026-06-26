import { Router } from 'express';
import { validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error.js';
import { reportsQuery } from '../validators/common.schema.js';
import { findById } from '../db/index.js';
import { projectReport } from '../services/aggregate.js';

const router = Router({ mergeParams: true });

/**
 * GET /api/projects/:projectId/reports?dateFrom=&dateTo=&groupBy=
 * -> { metrics, chartData: { passTrend, statusPie, byGroup } }
 */
router.get(
  '/',
  validateQuery(reportsQuery),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await findById('PROJECTS', projectId);
    if (!project) return res.status(404).json({ error: 'NotFound', message: 'Project not found' });

    const { dateFrom, dateTo, groupBy } = req.validatedQuery;
    const report = await projectReport(projectId, { dateFrom, dateTo, groupBy });
    res.json(report);
  })
);

export default router;
