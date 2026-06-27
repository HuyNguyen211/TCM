import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTask } from '../hooks/useTasks.js';
import { useSubtask } from '../hooks/useSubtasks.js';
import { useCan } from '../hooks/useCan.js';
import { taskStatusBadge } from '../lib/constants.js';
import Badge from '../components/common/Badge.jsx';
import { Spinner, ErrorState } from '../components/common/States.jsx';
import SubtaskForm from '../components/subtasks/SubtaskForm.jsx';
import TestCaseList from '../components/testcases/TestCaseList.jsx';
import ResourceLinks from '../components/common/ResourceLinks.jsx';
import JiraBadge from '../components/common/JiraBadge.jsx';
import GenTestcasesModal from '../components/ai/GenTestcasesModal.jsx';

export default function SubtaskDetail() {
  const { projectId, taskId, subtaskId } = useParams();
  const { data: task } = useTask(projectId, taskId);
  const { data: subtask, isLoading, isError } = useSubtask(projectId, taskId, subtaskId);
  const { writeContent } = useCan();
  const [editOpen, setEditOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);

  if (isLoading) return <Spinner />;
  if (isError || !subtask) return <ErrorState message="Subtask not found." />;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link to={`/projects/${projectId}`} className="text-brand-700 hover:underline">Project</Link>
          <span className="text-gray-300">/</span>
          <Link to={`/projects/${projectId}/tasks/${taskId}`} className="text-brand-700 hover:underline">
            {task?.taskName || 'Task'}
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{subtask.subtaskName}</h1>
            <Badge className={taskStatusBadge[subtask.status]}>{subtask.status}</Badge>
            <JiraBadge value={subtask.jiraKey} />
          </div>
          {writeContent && <button className="btn-secondary" onClick={() => setEditOpen(true)}>Edit subtask</button>}
        </div>
        {subtask.description && <p className="mt-1 text-sm text-gray-500">{subtask.description}</p>}
        {subtask.assignee && <p className="mt-1 text-xs text-gray-400">Assignee: {subtask.assignee}</p>}
        <ResourceLinks confluenceUrl={subtask.confluenceUrl} figmaUrl={subtask.figmaUrl} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Test Cases in this subtask</h3>
          {writeContent && <button className="btn-primary" onClick={() => setGenOpen(true)}>✨ Gen Testcase with AI</button>}
        </div>
        <TestCaseList projectId={projectId} taskId={taskId} subtaskId={subtaskId} />
      </div>

      <SubtaskForm open={editOpen} onClose={() => setEditOpen(false)} projectId={projectId} taskId={taskId} subtask={subtask} />
      <GenTestcasesModal open={genOpen} onClose={() => setGenOpen(false)} projectId={projectId} taskId={taskId} subtaskId={subtaskId} entity={subtask} />
    </div>
  );
}
