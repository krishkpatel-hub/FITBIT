import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function Login() {
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
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
      await login({
        email: formData.email,
        password: formData.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to log in. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-800 bg-slate-900/80 p-6">
      <h1 className="text-2xl font-bold text-slate-50">Login</h1>
      <p className="mt-2 text-sm text-slate-400">Sign in to access your FitBit-Strength dashboard.</p>

      {error && <p className="mt-4 rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 text-slate-50 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900"
        >
          {submitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-400">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-emerald-300 hover:text-emerald-200">
          Register
        </Link>
      </p>
    </section>
  );
}

export default Login;
