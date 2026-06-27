import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubtasks, useDeleteSubtask } from '../../hooks/useSubtasks.js';
import { useCan } from '../../hooks/useCan.js';
import { taskStatusBadge } from '../../lib/constants.js';
import Badge from '../common/Badge.jsx';
import JiraBadge from '../common/JiraBadge.jsx';
import { Spinner, ErrorState, EmptyState } from '../common/States.jsx';
import SubtaskForm from './SubtaskForm.jsx';

export default function SubtaskList({ projectId, taskId }) {
  const { writeContent } = useCan();
  const { data, isLoading, isError } = useSubtasks(projectId, taskId);
  const delMut = useDeleteSubtask(projectId, taskId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s) => { setEditing(s); setFormOpen(true); };
  const onDelete = (s) => {
    if (window.confirm(`Xóa subtask "${s.subtaskName}"? Test case bên trong cũng bị xóa.`)) delMut.mutate(s.subtaskId);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Subtasks {data ? `(${data.total})` : ''}</h3>
        {writeContent && <button className="btn-secondary" onClick={openCreate}>+ New Subtask</button>}
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorState message="Failed to load subtasks." />}
      {data && data.subtasks.length === 0 && (
        <EmptyState title="Chưa có subtask" hint="Subtask là tùy chọn — bạn vẫn có thể thêm test case trực tiếp vào task bên dưới." />
      )}

      {data && data.subtasks.length > 0 && (
        <div className="card divide-y divide-gray-100">
          {data.subtasks.map((s) => (
            <div key={s.subtaskId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <Link to={`/projects/${projectId}/tasks/${taskId}/subtasks/${s.subtaskId}`} className="font-medium text-brand-700 hover:underline">
                  {s.subtaskName}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <JiraBadge value={s.jiraKey} />
                  <span>{s.testCaseCount} test case</span>
                  {s.assignee && <span>· {s.assignee}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={taskStatusBadge[s.status]}>{s.status}</Badge>
                {writeContent && <button className="btn-secondary py-1" onClick={() => openEdit(s)}>Edit</button>}
                {writeContent && <button className="btn-secondary py-1 text-red-600" onClick={() => onDelete(s)}>Xóa</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <SubtaskForm open={formOpen} onClose={() => setFormOpen(false)} projectId={projectId} taskId={taskId} subtask={editing} />
    </section>
  );
}
