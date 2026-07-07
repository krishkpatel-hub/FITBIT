import { useAuth } from '../../context/AuthContext.jsx';

function Login() {
  const { login } = useAuth();

  const handleDemoLogin = () => {
    login({ token: 'demo-token', user: { name: 'Demo User' } });
  };

  return (
    <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-slate-950">Login</h1>
      <p className="mt-2 text-sm text-slate-600">Authentication forms will be implemented later.</p>
      <button
        type="button"
        onClick={handleDemoLogin}
        className="mt-6 w-full rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
      >
        Demo Login
      </button>
    </section>
  );
}

export default Login;

