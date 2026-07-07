import { Link } from 'react-router-dom';
import WorkoutCard from '../../components/WorkoutCard/WorkoutCard.jsx';

function Home() {
  return (
    <section className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Strength tracker</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-950">Build a stronger routine, one workout at a time.</h1>
        <p className="mt-4 text-slate-600">
          A clean MERN foundation for workouts, nutrition, progress tracking, and user profiles.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/register" className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
            Get Started
          </Link>
          <Link to="/login" className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-white">
            Login
          </Link>
        </div>
      </div>
      <WorkoutCard title="Today's Focus" description="Plan workouts, log exercises, and track strength progress." />
    </section>
  );
}

export default Home;

