/**
 * metrics.js — pure aggregation helpers. No I/O; callers pass in records.
 *
 * Execution statuses: PASSED | FAILED | BLOCKED | SKIPPED.
 * A test case's "latest" result is its most recent execution by executionDate.
 */

/** Latest execution per testCaseId (by executionDate, ISO strings sort lexicographically). */
export function latestExecutionByTestCase(executions) {
  const map = new Map();
  for (const ex of executions) {
    const prev = map.get(ex.testCaseId);
    if (!prev || (ex.executionDate || '') > (prev.executionDate || '')) {
      map.set(ex.testCaseId, ex);
    }
  }
  return map;
}

/**
 * Roll up metrics for a set of test cases + their executions.
 * "executed" = test cases that have at least one execution.
 * passRate / failRate are over executed cases (0 when none executed).
 */
export function rollup(testCases, executions) {
  const latest = latestExecutionByTestCase(executions);
  const totalCases = testCases.length;

  let executed = 0;
  let passed = 0;
  let failed = 0;
  let blocked = 0;
  let skipped = 0;

  for (const tc of testCases) {
    const ex = latest.get(tc.testCaseId);
    if (!ex) continue;
    executed += 1;
    switch (ex.status) {
      case 'PASSED': passed += 1; break;
      case 'FAILED': failed += 1; break;
      case 'BLOCKED': blocked += 1; break;
      case 'SKIPPED': skipped += 1; break;
      default: break;
    }
  }

  const pending = totalCases - executed;
  const round = (n) => Math.round(n * 10) / 10;
  const passRate = executed ? round((passed / executed) * 100) : 0;
  const failRate = executed ? round((failed / executed) * 100) : 0;

  return { totalCases, executed, pending, passed, failed, blocked, skipped, passRate, failRate };
}

/** Pie data over latest statuses: [{status, count}]. */
export function statusPie(testCases, executions) {
  const r = rollup(testCases, executions);
  return [
    { status: 'PASSED', count: r.passed },
    { status: 'FAILED', count: r.failed },
    { status: 'BLOCKED', count: r.blocked },
    { status: 'SKIPPED', count: r.skipped },
    { status: 'PENDING', count: r.pending },
  ];
}

/**
 * Pass-rate trend by execution day: [{date, rate}].
 * For each day, rate = passed/total executions that day * 100.
 * Optionally bounded by [dateFrom, dateTo] (YYYY-MM-DD inclusive).
 */
export function passTrend(executions, dateFrom, dateTo) {
  const byDay = new Map();
  for (const ex of executions) {
    const day = (ex.executionDate || '').slice(0, 10);
    if (!day) continue;
    if (dateFrom && day < dateFrom) continue;
    if (dateTo && day > dateTo) continue;
    if (!byDay.has(day)) byDay.set(day, { total: 0, passed: 0 });
    const bucket = byDay.get(day);
    bucket.total += 1;
    if (ex.status === 'PASSED') bucket.passed += 1;
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, b]) => ({ date, rate: b.total ? Math.round((b.passed / b.total) * 1000) / 10 : 0 }));
}

/** Group test-case rollups by an arbitrary field (e.g. 'module'): [{key, ...rollup}]. */
export function groupBy(testCases, executions, field) {
  const groups = new Map();
  for (const tc of testCases) {
    const k = tc[field] || 'UNSPECIFIED';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(tc);
  }
  return [...groups.entries()].map(([key, cases]) => {
    const ids = new Set(cases.map((c) => c.testCaseId));
    const exs = executions.filter((e) => ids.has(e.testCaseId));
    return { key, ...rollup(cases, exs) };
  });
}
