import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../common/Modal.jsx';
import { PROJECT_STATUS } from '../../lib/constants.js';
import { useCreateProject, useUpdateProject } from '../../hooks/useProjects.js';
import { apiErrorMessage } from '../../lib/api.js';

/**
 * Create/edit a project.
 * FE fields -> API: projectName, description, status  (see docs/FE-BE-MAPPING.md)
 */
export default function ProjectForm({ open, onClose, project }) {
  const isEdit = !!project;
  const [serverError, setServerError] = useState('');
  const createMut = useCreateProject();
  const updateMut = useUpdateProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { projectName: '', description: '', status: 'active' },
  });

  useEffect(() => {
    if (open) {
      reset({
        projectName: project?.projectName || '',
        description: project?.description || '',
        status: project?.status || 'active',
      });
      setServerError('');
    }
  }, [open, project, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ projectId: project.projectId, ...data });
      } else {
        await createMut.mutateAsync(data);
      }
      onClose();
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Project' : 'New Project'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Project Name <span className="text-red-500">*</span></label>
          <input
            className="input"
            placeholder="E-commerce Platform"
            {...register('projectName', {
              required: 'Project name is required',
              maxLength: { value: 100, message: 'Max 100 characters' },
            })}
          />
          {errors.projectName && <p className="field-error">{errors.projectName.message}</p>}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            rows={3}
            className="input"
            placeholder="Full-stack test cases…"
            {...register('description', { maxLength: { value: 500, message: 'Max 500 characters' } })}
          />
          {errors.description && <p className="field-error">{errors.description.message}</p>}
        </div>

        <div>
          <label className="label">Status</label>
          <select className="input" {...register('status')}>
            {PROJECT_STATUS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {serverError && <p className="field-error whitespace-pre-line">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
