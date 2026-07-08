import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import WorkoutCard from '../../components/WorkoutCard/WorkoutCard.jsx';

const ThreeBackground = lazy(() => import('../../components/ThreeBackground/ThreeBackground.jsx'));

function Home() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-10 shadow-2xl shadow-black/30 sm:px-8 lg:px-10">
      <Suspense fallback={null}>
        <ThreeBackground />
      </Suspense>
      <div className="relative z-10 grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Strength tracker</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
            Build a stronger routine, one workout at a time.
          </h1>
          <p className="mt-4 max-w-xl text-slate-300">
            A premium MERN fitness app for adaptive strength programming, workout tracking, nutrition, and progress.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-slate-700 bg-slate-950/60 px-4 py-2 font-medium text-slate-200 hover:bg-slate-900"
            >
              Login
            </Link>
          </div>
        </div>
        <WorkoutCard title="Today's Focus" description="Plan workouts, log exercises, and let adaptive progression guide your next training max." />
      </div>
    </section>
  );
}

export default Home;
