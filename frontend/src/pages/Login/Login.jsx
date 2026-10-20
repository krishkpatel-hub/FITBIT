import { useEffect, useRef, useState } from 'react';
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
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);
  const timerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerRef.current);
    };
  }, []);

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

    if (pendingRef.current) {
      return;
    }

    setError('');
    setStatusMessage('');
    setSubmitting(true);
    pendingRef.current = true;
    timerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setStatusMessage('preparing');
    }, 5000);

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      if (mountedRef.current) navigate('/dashboard', { replace: true });
    } catch (err) {
      if (!mountedRef.current) return;
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        setError("We couldn't sign you in right now. Please try again.");
      } else if (err.response?.status === 401) {
        setError('Email or password is incorrect.');
      } else if (err.response?.status === 429) {
        setError('Too many sign-in attempts. Please wait a moment and try again.');
      } else if (!err.response) {
        setError("We couldn't connect right now. Please try again.");
      } else {
        setError("We couldn't sign you in right now. Please try again.");
      }
    } finally {
      window.clearTimeout(timerRef.current);
      pendingRef.current = false;
      if (mountedRef.current) {
        setStatusMessage('');
        setSubmitting(false);
      }
    }
  };

  return (
    <section className="mx-auto max-w-md quiet-card">
      <Logo className="mb-6" />
      <h1 className="text-2xl font-bold text-stone-50">Login</h1>
      <p className="mt-2 text-sm text-stone-400">Sign in to access your GetJackedCoach dashboard.</p>

      {error && <p role="alert" className="mt-4 status-error">{error}</p>}
      {statusMessage && !error && (
        <div role="status" className="mt-4 flex items-start gap-3 border-y border-[#D2CFC7] py-4">
          <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#D2CFC7] border-t-[#2f4f46] motion-reduce:animate-none" />
          <div>
            <p className="text-sm font-semibold">Preparing GetJackedCoach</p>
            <p className="mt-1 text-sm text-stone-500">Getting your training workspace ready. This can take a moment after a period of inactivity.</p>
          </div>
        </div>
      )}

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
            className="form-field"
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
            className="form-field"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? statusMessage ? 'Preparing...' : 'Signing you in...' : 'Login'}
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
