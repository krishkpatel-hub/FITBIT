import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
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
      setError(err.response?.data?.message || err.message || 'Unable to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md quiet-card">
      <Logo className="mb-6" />
      <h1 className="text-2xl font-bold text-stone-50">Register</h1>
      <p className="mt-2 text-sm text-stone-400">Create your strength tracking account.</p>

      {error && <p className="mt-4 status-error">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-stone-300">First name</span>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              autoComplete="given-name"
              className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 text-stone-50 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-300">Last name</span>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              autoComplete="family-name"
              className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 text-stone-50 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-stone-300">Username</span>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 text-stone-50 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
          />
        </label>

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
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 text-stone-50 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-amber-200 hover:text-amber-100">
          Login
        </Link>
      </p>
    </section>
  );
}

export default Register;
