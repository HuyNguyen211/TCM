import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTasks, useDeleteTask } from '../../hooks/useTasks.js';
import { taskStatusBadge } from '../../lib/constants.js';
import Badge from '../common/Badge.jsx';
import JiraBadge from '../common/JiraBadge.jsx';
import { Spinner, ErrorState, EmptyState } from '../common/States.jsx';
import TaskForm from './TaskForm.jsx';

export default function TaskList({ projectId }) {
  const { data, isLoading, isError } = useTasks(projectId);
  const delMut = useDeleteTask(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t) => { setEditing(t); setFormOpen(true); };

  const onDelete = (t) => {
    if (window.confirm(`Xóa task "${t.taskName}"? Toàn bộ subtask và test case bên trong cũng bị xóa.`)) {
      delMut.mutate(t.taskId);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Tasks {data ? `(${data.total})` : ''} — sẽ link Jira sau</p>
        <button className="btn-primary" onClick={openCreate}>+ New Task</button>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorState message="Failed to load tasks." />}

      {data && data.tasks.length === 0 && (
        <EmptyState title="Chưa có task nào" hint="Tạo task đầu tiên để bắt đầu (test case nằm trong task/subtask)."
          action={<button className="btn-primary" onClick={openCreate}>+ New Task</button>} />
      )}

      {data && data.tasks.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.tasks.map((t) => (
            <div key={t.taskId} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/projects/${projectId}/tasks/${t.taskId}`} className="font-semibold text-brand-700 hover:underline">
                  {t.taskName}
                </Link>
                <Badge className={taskStatusBadge[t.status]}>{t.status}</Badge>
              </div>
              {t.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{t.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <JiraBadge value={t.jiraKey} />
                <span>{t.subtaskCount} subtask</span>
                <span>·</span>
                <span>{t.testCaseCount} test case</span>
                {t.assignee && <span>· {t.assignee}</span>}
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/projects/${projectId}/tasks/${t.taskId}`} className="btn-secondary py-1">Mở</Link>
                <button className="btn-secondary py-1" onClick={() => openEdit(t)}>Edit</button>
                <button className="btn-secondary py-1 text-red-600" onClick={() => onDelete(t)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} projectId={projectId} task={editing} />
    </section>
  );
}
