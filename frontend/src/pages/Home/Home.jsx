import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
import WorkoutCard from '../../components/WorkoutCard/WorkoutCard.jsx';

const ThreeBackground = lazy(() => import('../../components/ThreeBackground/ThreeBackground.jsx'));

function Home() {
  return (
    <section className="relative min-h-[620px] overflow-hidden rounded-xl border border-stone-800 bg-[#0d0c0a] px-6 py-12 sm:px-10 lg:px-12">
      <Suspense fallback={null}>
        <ThreeBackground />
      </Suspense>
      <div className="relative z-10 flex min-h-[520px] flex-col justify-between gap-12">
        <div className="max-w-4xl">
          <Logo className="mb-8" size="lg" showTagline />
          <p className="eyebrow">Strength Training Platform</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.045em] text-stone-50 sm:text-6xl lg:text-7xl">
            Train with numbers that actually mean something.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
            GetJackedCoach brings adaptive strength programming, workout logs, personal records, and progress history into one focused training workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary">
              Get Started
            </Link>
            <Link to="/login" className="btn-secondary">
              Login
            </Link>
          </div>
        </div>

        <div className="grid gap-6 border-t border-stone-800 pt-8 md:grid-cols-[0.85fr_1.15fr] md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-stone-500">Today’s Focus</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-stone-300">
              Plan workouts, log exercises, and let adaptive progression guide your next training max.
            </p>
          </div>
          <WorkoutCard
            title="GetJackedCoach"
            description="TRAIN SMART. GET STRONGER. TRACK PROGRESS."
          />
        </div>
      </div>
    </section>
  );
}

export default Home;
