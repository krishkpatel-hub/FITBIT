import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

function Login() {
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
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

    if (submitting) {
      return;
    }

    setError('');
    setStatusMessage('');
    setSubmitting(true);
    const coldStartTimer = window.setTimeout(() => {
      setStatusMessage('Starting the server. This may take up to a minute on the first request.');
    }, 5000);

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        setError('The server is taking longer than expected. Please try again.');
      } else if (err.response?.status === 401) {
        setError(err.response?.data?.message || 'Invalid credentials');
      } else if (err.response?.status === 429) {
        setError(err.response?.data?.message || 'Too many login attempts. Please try again later.');
      } else if (!err.response) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Unable to log in. Please try again.');
      }
    } finally {
      window.clearTimeout(coldStartTimer);
      setStatusMessage('');
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md quiet-card">
      <Logo className="mb-6" />
      <h1 className="text-2xl font-bold text-stone-50">Login</h1>
      <p className="mt-2 text-sm text-stone-400">Sign in to access your GetJackedCoach dashboard.</p>

      {error && <p className="mt-4 status-error">{error}</p>}
      {statusMessage && !error && <p className="mt-4 empty-state">{statusMessage}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-stone-300">Email</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 text-stone-50 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-300">Password</span>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 text-stone-50 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-400">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-amber-200 hover:text-amber-100">
          Register
        </Link>
      </p>
    </section>
  );
}

export default Login;
