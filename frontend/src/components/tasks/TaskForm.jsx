import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../common/Modal.jsx';
import { TASK_STATUS } from '../../lib/constants.js';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks.js';
import { apiErrorMessage } from '../../lib/api.js';

/** Create/edit a Task. Fields: taskName, description, status, assignee, jiraKey. */
export default function TaskForm({ open, onClose, projectId, task }) {
  const isEdit = !!task;
  const [serverError, setServerError] = useState('');
  const createMut = useCreateTask(projectId);
  const updateMut = useUpdateTask(projectId);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { taskName: '', description: '', status: 'To Do', assignee: '', jiraKey: '', confluenceUrl: '', figmaUrl: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      taskName: task?.taskName || '',
      description: task?.description || '',
      status: task?.status || 'To Do',
      assignee: task?.assignee || '',
      jiraKey: task?.jiraKey || '',
      confluenceUrl: task?.confluenceUrl || '',
      figmaUrl: task?.figmaUrl || '',
    });
    setServerError('');
  }, [open, task, reset]);

  const urlRule = { validate: (v) => !v || /^https?:\/\/.+/.test(v) || 'Must be a valid URL (http/https)' };

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) await updateMut.mutateAsync({ taskId: task.taskId, ...data });
      else await createMut.mutateAsync(data);
      onClose();
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Task Name <span className="text-red-500">*</span></label>
          <input className="input" placeholder="Authentication" {...register('taskName', { required: 'Task name is required', maxLength: { value: 200, message: 'Max 200 characters' } })} />
          {errors.taskName && <p className="field-error">{errors.taskName.message}</p>}
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={3} className="input" {...register('description')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              {TASK_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assignee</label>
            <input className="input" placeholder="tester@example.com" {...register('assignee', { validate: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Must be a valid email' })} />
            {errors.assignee && <p className="field-error">{errors.assignee.message}</p>}
          </div>
        </div>
        <div>
          <label className="label">Jira URL</label>
          <input className="input" placeholder="https://firegroup.atlassian.net/..." {...register('jiraKey')} />
        </div>
        <div>
          <label className="label">Confluence URL</label>
          <input className="input" placeholder="https://confluence.example.com/..." {...register('confluenceUrl', urlRule)} />
          {errors.confluenceUrl && <p className="field-error">{errors.confluenceUrl.message}</p>}
        </div>
        <div>
          <label className="label">Figma URL</label>
          <input className="input" placeholder="https://figma.com/file/..." {...register('figmaUrl', urlRule)} />
          {errors.figmaUrl && <p className="field-error">{errors.figmaUrl.message}</p>}
        </div>

        {serverError && <p className="field-error whitespace-pre-line">{serverError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}</button>
        </div>
      </form>
    </Modal>
  );
}
