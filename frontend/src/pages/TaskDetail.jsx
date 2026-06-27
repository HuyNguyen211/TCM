import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTask } from '../hooks/useTasks.js';
import { useCan } from '../hooks/useCan.js';
import { taskStatusBadge } from '../lib/constants.js';
import Badge from '../components/common/Badge.jsx';
import { ErrorState } from '../components/common/States.jsx';
import { DetailSkeleton } from '../components/common/Skeleton.jsx';
import TaskForm from '../components/tasks/TaskForm.jsx';
import SubtaskList from '../components/subtasks/SubtaskList.jsx';
import TestCaseList from '../components/testcases/TestCaseList.jsx';
import ResourceLinks from '../components/common/ResourceLinks.jsx';
import JiraBadge from '../components/common/JiraBadge.jsx';
import GenTestcasesModal from '../components/ai/GenTestcasesModal.jsx';

export default function TaskDetail() {
  const { projectId, taskId } = useParams();
  const { data: task, isLoading, isError } = useTask(projectId, taskId);
  const { writeContent } = useCan();
  const [editOpen, setEditOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !task) return <ErrorState message="Task not found." />;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projects/${projectId}`} className="text-sm text-brand-700 hover:underline">← Back to project</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{task.taskName}</h1>
            <Badge className={taskStatusBadge[task.status]}>{task.status}</Badge>
            <JiraBadge value={task.jiraKey} />
          </div>
          {writeContent && <button className="btn-secondary" onClick={() => setEditOpen(true)}>Edit task</button>}
        </div>
        {task.description && <p className="mt-1 text-sm text-gray-500">{task.description}</p>}
        {task.assignee && <p className="mt-1 text-xs text-gray-400">Assignee: {task.assignee}</p>}
        <ResourceLinks confluenceUrl={task.confluenceUrl} figmaUrl={task.figmaUrl} />
      </div>

      {/* Subtasks */}
      <SubtaskList projectId={projectId} taskId={taskId} />

      {/* Test cases attached DIRECTLY to this task (no subtask) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Test Cases (directly under this task)</h3>
          {writeContent && <button className="btn-primary" onClick={() => setGenOpen(true)}>✨ Gen Testcase with AI</button>}
        </div>
        <p className="text-xs text-gray-400">Test cases that belong to no subtask. A subtask's test cases live on its subtask page.</p>
        <TestCaseList projectId={projectId} taskId={taskId} />
      </div>

      <TaskForm open={editOpen} onClose={() => setEditOpen(false)} projectId={projectId} task={task} />
      <GenTestcasesModal open={genOpen} onClose={() => setGenOpen(false)} projectId={projectId} taskId={taskId} entity={task} />
    </div>
  );
}
