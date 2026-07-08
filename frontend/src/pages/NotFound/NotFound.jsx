import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="text-center">
      <h1 className="text-3xl font-bold text-slate-50">Page Not Found</h1>
      <p className="mt-2 text-slate-400">The page you requested does not exist.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400">
        Back Home
      </Link>
    </section>
  );
}

export default NotFound;

