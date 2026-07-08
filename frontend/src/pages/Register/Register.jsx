import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function Register() {
  const { isAuthenticated, loading: authLoading, register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register(formData);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-800 bg-slate-900/80 p-6">
      <h1 className="text-2xl font-bold text-slate-50">Register</h1>
      <p className="mt-2 text-sm text-slate-400">Create your strength tracking account.</p>

      {error && <p className="mt-4 rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">First name</span>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              autoComplete="given-name"
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 text-slate-50 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Last name</span>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              autoComplete="family-name"
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 text-slate-50 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Username</span>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 text-slate-50 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Email</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 text-slate-50 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Password</span>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 text-slate-50 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900"
        >
          {submitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-emerald-300 hover:text-emerald-200">
          Login
        </Link>
      </p>
    </section>
  );
}

export default Register;
