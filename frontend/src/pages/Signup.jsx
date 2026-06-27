import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiErrorMessage } from '../lib/api.js';
import { SIGNUP_ROLES } from '../lib/constants.js';

export default function Signup() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', email: '', password: '', confirm: '', role: 'tester' } });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async ({ name, email, password, role }) => {
    setServerError('');
    try {
      await signup({ name: name.trim(), email: email.trim(), password, role });
      navigate('/');
    } catch (err) {
      setServerError(apiErrorMessage(err));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            T
          </div>
          <h1 className="text-xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Test Case Management</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              autoFocus
              className="input"
              placeholder="Jane Tester"
              {...register('name', {
                required: 'Name is required',
                maxLength: { value: 80, message: 'Name is too long' },
              })}
            />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@firegroup.io"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
            />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="role">Role</label>
            <select id="role" className="input" {...register('role')}>
              {SIGNUP_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
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

          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              className="input"
              placeholder="Re-enter password"
              {...register('confirm', {
                required: 'Please confirm your password',
                validate: (v) => v === watch('password') || 'Passwords do not match',
              })}
            />
            {errors.confirm && <p className="field-error">{errors.confirm.message}</p>}
          </div>

          {serverError && <p className="field-error whitespace-pre-line">{serverError}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Creating account…' : 'Sign up'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
