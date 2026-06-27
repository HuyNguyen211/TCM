/** Strip secrets (passwordHash) before sending a user to clients. */
export function publicUser(u) {
  return {
    userId: u.userId,
    email: u.email,
    name: u.name || '',
    role: u.role,
    projects: u.projects,
    lastLogin: u.lastLogin,
    managerId: u.managerId || '',
  };
}
