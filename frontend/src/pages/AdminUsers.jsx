import { useState } from 'react';
import { useUsers, useDeleteUser } from '../hooks/useUsers.js';
import { useAuth } from '../context/AuthContext.jsx';
import { roleBadge } from '../lib/constants.js';
import { apiErrorMessage } from '../lib/api.js';
import Badge from '../components/common/Badge.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/common/States.jsx';
import UserForm from '../components/users/UserForm.jsx';
import ResetPasswordModal from '../components/users/ResetPasswordModal.jsx';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { data, isLoading, isError } = useUsers();
  const deleteMut = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [actionError, setActionError] = useState('');

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u) => { setEditing(u); setFormOpen(true); };

  const onDelete = async (u) => {
    setActionError('');
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try {
      await deleteMut.mutateAsync(u.userId);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  };

  const users = data?.users || [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-gray-500">Create accounts, assign roles, and reset passwords.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ New User</button>
      </div>

      {actionError && <ErrorState message={actionError} />}

      {isLoading && <Spinner />}
      {isError && <ErrorState message="Failed to load users." />}

      {data && users.length === 0 && (
        <EmptyState
          title="No users yet"
          hint="Create the first account to get started."
          action={<button className="btn-primary" onClick={openCreate}>+ New User</button>}
        />
      )}

      {data && users.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Last login</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isMe = u.userId === me?.userId;
                return (
                  <tr key={u.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {u.name || <span className="text-gray-400">—</span>}
                      {isMe && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={roleBadge[u.role] || 'bg-gray-100 text-gray-700'}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-500">{fmtDate(u.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="btn-secondary py-1" onClick={() => openEdit(u)}>Edit</button>
                        <button className="btn-secondary py-1" onClick={() => setResetTarget(u)}>Reset password</button>
                        <button
                          className="btn-secondary py-1 text-red-600 disabled:text-gray-300"
                          disabled={isMe || deleteMut.isPending}
                          title={isMe ? "You can't delete your own account" : 'Delete user'}
                          onClick={() => onDelete(u)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UserForm open={formOpen} onClose={() => setFormOpen(false)} user={editing} />
      <ResetPasswordModal open={!!resetTarget} onClose={() => setResetTarget(null)} user={resetTarget} />
    </section>
  );
}
