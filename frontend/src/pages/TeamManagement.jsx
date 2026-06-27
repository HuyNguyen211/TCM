import { useState } from 'react';
import { useTeam, useAddTeamMember, useRemoveTeamMember } from '../hooks/useTeam.js';
import { apiErrorMessage } from '../lib/api.js';
import { Spinner, ErrorState, EmptyState } from '../components/common/States.jsx';

export default function TeamManagement() {
  const { data, isLoading, isError } = useTeam();
  const addMut = useAddTeamMember();
  const removeMut = useRemoveTeamMember();
  const [actionError, setActionError] = useState('');

  const members = data?.members || [];
  const available = data?.available || [];

  const add = async (userId) => {
    setActionError('');
    try { await addMut.mutateAsync(userId); } catch (err) { setActionError(apiErrorMessage(err)); }
  };
  const remove = async (userId) => {
    setActionError('');
    try { await removeMut.mutateAsync(userId); } catch (err) { setActionError(apiErrorMessage(err)); }
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Team</h1>
        <p className="text-sm text-gray-500">Manage the testers in your group — add available testers or remove them.</p>
      </div>

      {actionError && <ErrorState message={actionError} />}
      {isLoading && <Spinner />}
      {isError && <ErrorState message="Failed to load your team." />}

      {data && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Current team members */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Team members ({members.length})
            </h2>
            {members.length === 0 ? (
              <EmptyState title="No members yet" hint="Add testers from the available list on the right." />
            ) : (
              <div className="card divide-y divide-gray-100">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <p className="font-medium">{m.name || m.email}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </div>
                    <button
                      className="btn-secondary py-1 text-red-600 disabled:opacity-50"
                      disabled={removeMut.isPending}
                      onClick={() => remove(m.userId)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available (unassigned) testers */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Available testers ({available.length})
            </h2>
            {available.length === 0 ? (
              <EmptyState title="No available testers" hint="All testers are already assigned to a team." />
            ) : (
              <div className="card divide-y divide-gray-100">
                {available.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <p className="font-medium">{u.name || u.email}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <button
                      className="btn-primary py-1 disabled:opacity-50"
                      disabled={addMut.isPending}
                      onClick={() => add(u.userId)}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
