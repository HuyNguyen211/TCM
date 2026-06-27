import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
            <span className="grid h-7 w-7 place-items-center rounded bg-brand-600 text-white">T</span>
            TCM
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              to="/"
              className={pathname === '/' ? 'font-semibold text-brand-700' : 'text-gray-600 hover:text-gray-900'}
            >
              Dashboard
            </Link>
            <Link
              to="/integrations"
              className={pathname === '/integrations' ? 'font-semibold text-brand-700' : 'text-gray-600 hover:text-gray-900'}
            >
              Integrations
            </Link>
            {(user?.role === 'lead' || user?.role === 'admin') && (
              <Link
                to="/team"
                className={pathname === '/team' ? 'font-semibold text-brand-700' : 'text-gray-600 hover:text-gray-900'}
              >
                Team
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link
                to="/admin/users"
                className={pathname === '/admin/users' ? 'font-semibold text-brand-700' : 'text-gray-600 hover:text-gray-900'}
              >
                Users
              </Link>
            )}
            {user && (
              <div className="flex items-center gap-3">
                <span className="hidden text-gray-500 sm:inline">{user.name || user.email}</span>
                <span className="badge bg-brand-50 text-brand-700">{user.role}</span>
                <button onClick={logout} className="btn-secondary">Logout</button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
