import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiErrorMessage } from '../lib/api.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      await login(email.trim(), password);
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
          <h1 className="text-xl font-bold">Test Case Management</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoFocus
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
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          {serverError && <p className="field-error whitespace-pre-line">{serverError}</p>}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-gray-500">
            No account?{' '}
            <Link to="/signup" className="font-medium text-brand-700 hover:underline">
              Sign up
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400">
            Demo: demo@firegroup.io · password123
          </p>
        </form>
      </div>
    </div>
  );
}
