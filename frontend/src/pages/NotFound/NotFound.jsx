import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="mx-auto max-w-2xl py-20 text-center" aria-labelledby="not-found-heading">
      <p className="eyebrow">404</p>
      <h1 id="not-found-heading" className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-[#151714] sm:text-5xl">
        Page not found.
      </h1>
      <p className="mt-4 text-base leading-7 text-[#4F534E]">
        The page you requested does not exist, or it may require a different route.
      </p>
      <Link to="/" className="btn-primary mt-8">
        Go to homepage
      </Link>
    </section>
  );
}

export default NotFound;
