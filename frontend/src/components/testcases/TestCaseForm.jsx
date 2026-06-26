import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import Modal from '../common/Modal.jsx';
import TagInput from '../common/TagInput.jsx';
import { MODULES, PRIORITIES, TESTCASE_STATUS } from '../../lib/constants.js';
import { useCreateTestCase, useUpdateTestCase } from '../../hooks/useTestCases.js';
import { apiErrorMessage } from '../../lib/api.js';

const emptyStep = { action: '', expected: '' };

/**
 * Create/edit a test case.
 * FE -> API mapping (see docs/FE-BE-MAPPING.md):
 *   testCaseName, module, priority, status, assignedTo,
 *   tags: string[]            (TagInput)
 *   steps[] -> stepsJSON      (useFieldArray, JSON.stringify on submit)
 */
export default function TestCaseForm({ open, onClose, projectId, taskId, subtaskId = '', testCase }) {
  const isEdit = !!testCase;
  const [serverError, setServerError] = useState('');
  const createMut = useCreateTestCase(projectId);
  const updateMut = useUpdateTestCase(projectId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      testCaseName: '',
      module: 'UI',
      priority: 'MEDIUM',
      status: 'DRAFT',
      assignedTo: '',
      tags: [],
      steps: [emptyStep],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'steps' });

  useEffect(() => {
    if (!open) return;
    reset({
      testCaseName: testCase?.testCaseName || '',
      module: testCase?.module || 'UI',
      priority: testCase?.priority || 'MEDIUM',
      status: testCase?.status || 'DRAFT',
      assignedTo: testCase?.assignedTo || '',
      tags: testCase?.tags || [],
      steps: testCase?.steps?.length ? testCase.steps.map((s) => ({ action: s.action, expected: s.expected })) : [emptyStep],
    });
    setServerError('');
  }, [open, testCase, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    // Serialize steps -> stepsJSON (backend re-numbers `step`).
    const stepsJSON = JSON.stringify(
      data.steps
        .filter((s) => s.action.trim() || s.expected.trim())
        .map((s, i) => ({ step: i + 1, action: s.action, expected: s.expected }))
    );
    const payload = {
      testCaseName: data.testCaseName,
      module: data.module,
      priority: data.priority,
      status: data.status,
      assignedTo: data.assignedTo || '',
      tags: data.tags,
      stepsJSON,
    };
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ testCaseId: testCase.testCaseId, ...payload });
      } else {
        // Attach to the current task / subtask scope.
        await createMut.mutateAsync({ ...payload, taskId, subtaskId });
      }
      onClose();
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Test Case' : 'New Test Case'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Test Case Name <span className="text-red-500">*</span></label>
          <input
            className="input"
            placeholder="TC_001_Login"
            {...register('testCaseName', {
              required: 'Test case name is required',
              maxLength: { value: 200, message: 'Max 200 characters' },
            })}
          />
          {errors.testCaseName && <p className="field-error">{errors.testCaseName.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Module</label>
            <select className="input" {...register('module')}>
              {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              {TESTCASE_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned To</label>
            <input
              className="input"
              placeholder="tester@example.com"
              {...register('assignedTo', {
                validate: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Must be a valid email',
              })}
            />
            {errors.assignedTo && <p className="field-error">{errors.assignedTo.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Priority</label>
          <div className="flex flex-wrap gap-3">
            {PRIORITIES.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm">
                <input type="radio" value={p} {...register('priority')} />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Tags</label>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
          />
        </div>

        {/* Steps table -> stepsJSON */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">Test Steps <span className="text-red-500">*</span></label>
            <button type="button" className="btn-secondary py-1" onClick={() => append(emptyStep)}>+ Add step</button>
          </div>
          <div className="overflow-hidden rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="w-12 px-2 py-2">#</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Expected Result</th>
                  <th className="w-10 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((f, idx) => (
                  <tr key={f.id}>
                    <td className="px-2 py-2 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        className="input py-1"
                        placeholder="Enter username"
                        {...register(`steps.${idx}.action`, {
                          validate: (v, all) =>
                            // require action if this row has an expected value, and require >=1 row overall
                            (!all.steps[idx].expected || !!v.trim()) || 'Action required',
                        })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="input py-1"
                        placeholder="User redirected to dashboard"
                        {...register(`steps.${idx}.expected`, {
                          validate: (v, all) =>
                            (!all.steps[idx].action || !!v.trim()) || 'Expected required',
                        })}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-600"
                        onClick={() => (fields.length > 1 ? remove(idx) : null)}
                        disabled={fields.length === 1}
                        title="Remove step"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-gray-400">At least one step with an action and expected result is required.</p>
        </div>

        {serverError && <p className="field-error whitespace-pre-line">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create test case'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
