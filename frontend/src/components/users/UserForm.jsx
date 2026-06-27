import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../common/Modal.jsx';
import { ROLES } from '../../lib/constants.js';
import { useCreateUser, useUpdateUser } from '../../hooks/useUsers.js';
import { apiErrorMessage } from '../../lib/api.js';

/**
 * Create or edit a user (admin only).
 * Create: name, email, password, role. Edit: name + role (email is immutable;
 * reset the password from the table action instead).
 */
export default function UserForm({ open, onClose, user }) {
  const isEdit = !!user;
  const [serverError, setServerError] = useState('');
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', email: '', password: '', role: 'tester' } });

  useEffect(() => {
    if (open) {
      reset({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'tester',
      });
      setServerError('');
    }
  }, [open, user, reset]);

  const onSubmit = async (data) => {
    setServerError('');
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ userId: user.userId, name: data.name.trim(), role: data.role });
      } else {
        await createMut.mutateAsync({
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.password,
          role: data.role,
        });
      }
      onClose();
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit User' : 'New User'} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Name <span className="text-red-500">*</span></label>
          <input
            className="input"
            placeholder="Jane Tester"
            {...register('name', {
              required: 'Name is required',
              maxLength: { value: 80, message: 'Max 80 characters' },
            })}
          />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            className="input disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="user@firegroup.io"
            disabled={isEdit}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
            })}
          />
          {isEdit && <p className="mt-1 text-xs text-gray-400">Email can't be changed.</p>}
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        {!isEdit && (
          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <input
              type="password"
              className="input"
              placeholder="At least 8 characters"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>
        )}

        <div>
          <label className="label">Role</label>
          <select className="input" {...register('role')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {serverError && <p className="field-error whitespace-pre-line">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
