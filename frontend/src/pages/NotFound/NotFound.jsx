import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="text-center">
      <h1 className="text-3xl font-bold text-stone-50">Page Not Found</h1>
      <p className="mt-2 text-stone-400">The page you requested does not exist.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-amber-300 px-4 py-2 font-medium text-stone-950 hover:bg-amber-200">
        Back Home
      </Link>
    </section>
  );
}

export default NotFound;

