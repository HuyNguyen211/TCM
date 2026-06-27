import { useAuth } from '../context/AuthContext.jsx';
import { can } from '../lib/permissions.js';

/** Capability booleans for the current user's role. */
export function useCan() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    role,
    writeContent: can(role, 'writeContent'),
    manageProjects: can(role, 'manageProjects'),
    manageTeam: can(role, 'manageTeam'),
    manageUsers: can(role, 'manageUsers'),
  };
}
