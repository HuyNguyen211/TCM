import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../common/Modal.jsx';
import { useResetUserPassword } from '../../hooks/useUsers.js';
import { apiErrorMessage } from '../../lib/api.js';

/** Admin resets a user's password. `user` is the target (null = closed). */
export default function ResetPasswordModal({ open, onClose, user }) {
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const resetMut = useResetUserPassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { password: '' } });

  useEffect(() => {
    if (open) {
      reset({ password: '' });
      setServerError('');
      setDone(false);
    }
  }, [open, user, reset]);

  const onSubmit = async ({ password }) => {
    setServerError('');
    try {
      await resetMut.mutateAsync({ userId: user.userId, password });
      setDone(true);
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reset Password" maxWidth="max-w-md">
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Password updated for <span className="font-medium">{user?.email}</span>. Share it with
            them securely — it isn't stored in plain text and can't be shown again.
          </p>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-gray-600">
            Set a new password for <span className="font-medium">{user?.email}</span>.
          </p>
          <div>
            <label className="label">New password <span className="text-red-500">*</span></label>
            <input
              type="password"
              autoFocus
              className="input"
              placeholder="At least 8 characters"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          {serverError && <p className="field-error whitespace-pre-line">{serverError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
