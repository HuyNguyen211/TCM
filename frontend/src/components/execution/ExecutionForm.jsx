import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import Modal from '../common/Modal.jsx';
import { EXECUTION_STATUS, EXECUTION_LABELS } from '../../lib/constants.js';
import { useCreateExecution } from '../../hooks/useExecutions.js';
import { apiErrorMessage } from '../../lib/api.js';

/**
 * Record an execution.
 * FE -> API mapping (see docs/FE-BE-MAPPING.md):
 *   executionStatus  (radio)        -> column E `status`
 *   failureReason    (conditional)  -> required when executionStatus === 'FAILED'
 *   notes, duration (seconds)
 *   evidenceUrls: string[]          (paste URLs — Phase-3 swaps in real upload)
 */
export default function ExecutionForm({ open, onClose, projectId, testCaseId, testCaseName }) {
  const [serverError, setServerError] = useState('');
  const createMut = useCreateExecution(projectId, testCaseId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { executionStatus: 'PASSED', failureReason: '', notes: '', duration: 0, evidence: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'evidence' });
  const executionStatus = watch('executionStatus');
  const showFailureReason = executionStatus === 'FAILED';

  useEffect(() => {
    if (open) {
      reset({ executionStatus: 'PASSED', failureReason: '', notes: '', duration: 0, evidence: [] });
      setServerError('');
    }
  }, [open, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    const payload = {
      executionStatus: data.executionStatus,
      failureReason: showFailureReason ? data.failureReason : null,
      notes: data.notes || null,
      duration: Number(data.duration) || 0,
      evidenceUrls: data.evidence.map((e) => e.url).filter((u) => u && u.trim()),
    };
    try {
      await createMut.mutateAsync(payload);
      onClose();
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Record Execution${testCaseName ? ` — ${testCaseName}` : ''}`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Result <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EXECUTION_STATUS.map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center justify-center gap-1 rounded-md border px-2 py-2 text-sm ${
                  executionStatus === s ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700' : 'border-gray-300'
                }`}
              >
                <input type="radio" value={s} className="sr-only" {...register('executionStatus')} />
                {EXECUTION_LABELS[s]}
              </label>
            ))}
          </div>
        </div>

        {showFailureReason && (
          <div>
            <label className="label">Failure Reason <span className="text-red-500">*</span></label>
            <textarea
              rows={2}
              className="input"
              placeholder="Login button not clickable"
              {...register('failureReason', {
                validate: (v) => !showFailureReason || (v && v.trim()) ? true : 'Failure reason is required when status is FAILED',
              })}
            />
            {errors.failureReason && <p className="field-error">{errors.failureReason.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Duration (seconds)</label>
            <input type="number" min="0" className="input" {...register('duration', { min: { value: 0, message: 'Must be ≥ 0' } })} />
            {errors.duration && <p className="field-error">{errors.duration.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea rows={2} className="input" placeholder="Tested on Chrome 120" {...register('notes')} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">Evidence URLs</label>
            <button type="button" className="btn-secondary py-1" onClick={() => append({ url: '' })}>+ Add URL</button>
          </div>
          {fields.length === 0 && <p className="text-xs text-gray-400">Paste screenshot / recording links (Imgur, Drive, …).</p>}
          <div className="space-y-2">
            {fields.map((f, idx) => (
              <div key={f.id} className="flex gap-2">
                <input
                  className="input"
                  placeholder="https://imgur.com/screenshot1"
                  {...register(`evidence.${idx}.url`, {
                    validate: (v) => !v || /^https?:\/\/.+/.test(v) || 'Must be a valid URL',
                  })}
                />
                <button type="button" className="btn-secondary px-2" onClick={() => remove(idx)}>✕</button>
              </div>
            ))}
          </div>
          {errors.evidence && <p className="field-error">One or more URLs are invalid.</p>}
        </div>

        {serverError && <p className="field-error whitespace-pre-line">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Record execution'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
