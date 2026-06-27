/**
 * Role capability matrix — mirrors the backend route guards.
 *   viewer  : read-only everything
 *   tester  : + create/edit tasks, subtasks, test cases, executions
 *   lead    : + create/edit projects, manage a team of testers
 *   admin   : + manage all users
 */
export const PERMISSIONS = {
  writeContent: ['tester', 'lead', 'admin'], // tasks / subtasks / testcases / executions / suites
  manageProjects: ['lead', 'admin'], // create / edit projects
  manageTeam: ['lead', 'admin'], // lead's team of testers
  manageUsers: ['admin'], // full user management
};

export function can(role, permission) {
  return (PERMISSIONS[permission] || []).includes(role);
}
