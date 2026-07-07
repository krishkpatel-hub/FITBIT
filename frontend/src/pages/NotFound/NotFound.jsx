import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="text-center">
      <h1 className="text-3xl font-bold text-slate-950">Page Not Found</h1>
      <p className="mt-2 text-slate-600">The page you requested does not exist.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
        Back Home
      </Link>
    </section>
  );
}

export default NotFound;

