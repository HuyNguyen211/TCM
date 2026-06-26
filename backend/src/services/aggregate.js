/**
 * aggregate.js — fetch + compute helpers shared by the projects and reports routes.
 * Keeps the "totalCases / passRate are computed, never trusted-stale" rule in one place.
 */
import { list } from '../db/index.js';
import { rollup, statusPie, passTrend, groupBy } from '../utils/metrics.js';

/** Test cases for a project, excluding soft-deleted (DEPRECATED) by default. */
export async function projectTestCases(projectId, { includeDeprecated = true } = {}) {
  const all = await list('TESTCASES');
  return all.filter(
    (tc) => tc.projectId === projectId && (includeDeprecated || tc.status !== 'DEPRECATED')
  );
}

/** Executions belonging to a set of test-case ids. */
export async function executionsForTestCases(testCaseIds) {
  const set = new Set(testCaseIds);
  const all = await list('EXECUTIONS');
  return all.filter((ex) => set.has(ex.testCaseId));
}

/** Rollup metrics for a single project. */
export async function projectRollup(projectId) {
  const testCases = await projectTestCases(projectId);
  const executions = await executionsForTestCases(testCases.map((t) => t.testCaseId));
  return rollup(testCases, executions);
}

/** Full report payload for a project (metrics + chartData). */
export async function projectReport(projectId, { dateFrom, dateTo, groupBy: groupField } = {}) {
  const testCases = await projectTestCases(projectId);
  const executions = await executionsForTestCases(testCases.map((t) => t.testCaseId));
  const metrics = rollup(testCases, executions);
  return {
    metrics: {
      totalCases: metrics.totalCases,
      passRate: metrics.passRate,
      failRate: metrics.failRate,
      executed: metrics.executed,
      pending: metrics.pending,
    },
    chartData: {
      passTrend: passTrend(executions, dateFrom, dateTo),
      statusPie: statusPie(testCases, executions),
      byGroup: groupBy(testCases, executions, groupField || 'module'),
    },
  };
}
