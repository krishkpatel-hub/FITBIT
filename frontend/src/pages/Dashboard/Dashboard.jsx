import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { dashboardService } from '../../services/dashboardService';
import { demoService } from '../../services/demoService';
import { trainingMaxService } from '../../services/trainingMaxService';
import { appPaths } from '../../utils/navigation';

const formatDate = (date) => date ? new Intl.DateTimeFormat('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
}).format(new Date(date)) : 'Not scheduled';

function Dashboard() {
  const { logout, user } = useAuth();
  const realtime = useRealtime();
  const [dashboard, setDashboard] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDashboard = async () => {
    setError('');
    try {
      const [response, programResponse] = await Promise.all([
        dashboardService.getDashboard(),
        trainingMaxService.getProgramWeeks(),
      ]);
      setDashboard(response.data);
      setWeeks(programResponse.data || []);
    } catch (err) {
      if (err.response?.status === 401) await logout();
      else setError(err.response?.data?.message || 'Unable to load your training. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => {
    if (!realtime) return undefined;
    return realtime.subscribe(['workout.updated', 'workout.completed', 'progress.updated'], loadDashboard);
  }, [realtime]);

  const seedDemoData = async () => {
    setSeeding(true);
    setError('');
    setSuccess('');
    try {
      const response = await demoService.seedDemoData();
      setSuccess(response.data?.message || 'Demo data created for this account.');
      await loadDashboard();
    } catch (err) {
      if (err.response?.status === 401) await logout();
      else setError(err.response?.data?.message || 'Unable to create demo data.');
    } finally {
      setSeeding(false);
    }
  };

  const trainingMaxes = dashboard?.currentTrainingMaxes || dashboard?.trainingMaxes || [];
  const strengthReady = ['squat', 'bench', 'deadlift', 'overhead_press'].every((lift) =>
    trainingMaxes.some((entry) => entry.liftName === lift && Number(entry.oneRepMax) > 0));
  const generatedWeeks = weeks.filter((week) => week.workouts?.length > 0);
  const currentWeek = [...generatedWeeks].sort((a, b) => Number(b.weekNumber || b.week) - Number(a.weekNumber || a.week))[0];
  const nextWorkout = currentWeek?.workouts?.find((workout) => workout.status === 'planned') || dashboard?.nextWorkout;
  const lastWorkout = dashboard?.lastWorkout;
  const steps = [
    { label: 'Set your strength', copy: 'Enter your four one-rep maxes in Program.', done: strengthReady },
    { label: 'Generate your program', copy: 'Create your first four-day week from those numbers.', done: false },
    { label: 'Start training', copy: 'Open a planned session in Train and record your sets.', done: false },
  ];

  return (
    <section className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Home</p>
        <h1 className="page-title">Welcome{user?.firstName ? `, ${user.firstName}` : ' back'}.</h1>
        <p className="page-copy">Your next step, without the noise.</p>
      </header>

      {error && <div role="alert" className="status-error">{error} <button type="button" onClick={loadDashboard} className="ml-2 underline">Retry</button></div>}
      {success && <p role="status" className="status-success">{success}</p>}

      {loading ? (
        <div className="dashboard-loader" role="status" aria-label="Loading your training"><div /><div /><span className="sr-only">Loading your training...</span></div>
      ) : dashboard && (
        <>
          {currentWeek ? (
            <section className="space-y-6" aria-labelledby="next-training-heading">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
                <p>Current program / Week {currentWeek.weekNumber || currentWeek.week} of 4</p>
                <p>{currentWeek.daysCompleted || 0} of 4 days completed</p>
              </div>
              <div className="border-y border-[#D2CFC7] py-8">
                <p className="eyebrow">{nextWorkout ? 'Next workout' : 'Your program'}</p>
                <h2 id="next-training-heading" className="mt-3 text-2xl font-semibold sm:text-3xl">
                  {nextWorkout?.title || (currentWeek.status === 'completed' ? 'Week complete. Ready for your next step.' : 'Continue your training week.')}
                </h2>
                <p className="mt-3 text-stone-500">
                  {nextWorkout ? formatDate(nextWorkout.date) : 'Open Program to review your week and prepare what comes next.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to={appPaths.program} className="btn-primary">Continue Program</Link>
                  {nextWorkout && <Link to={appPaths.train} state={{ plannedWorkoutId: nextWorkout._id }} className="btn-secondary">Start Workout</Link>}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
                <Link to={appPaths.program} className="underline underline-offset-4">Update strength numbers</Link>
                <Link to={appPaths.calendar} className="underline underline-offset-4">View calendar</Link>
              </div>
            </section>
          ) : (
            <section aria-labelledby="getting-started-heading">
              <h2 id="getting-started-heading" className="section-title">Build your first training week</h2>
              <p className="section-copy">Start with your strength numbers. Your plan and workout log stay connected.</p>
              <ol className="mt-6 divide-y divide-[#D2CFC7] border-y border-[#D2CFC7]">
                {steps.map((step, index) => (
                  <li key={step.label} className="flex items-start gap-5 py-5">
                    <span className="pt-1 text-sm tabular-nums text-stone-500">0{index + 1}</span>
                    <div>
                      <h3 className="font-semibold">{step.label}{step.done && <span className="ml-3 text-xs font-normal text-stone-500">Complete</span>}</h3>
                      <p className="mt-1 text-sm text-stone-500">{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link to={appPaths.program} className="btn-primary">{strengthReady ? 'Generate your program' : 'Set your strength'}</Link>
                <Link to={appPaths.templates} className="text-sm font-semibold underline underline-offset-4">Prefer a custom workout?</Link>
              </div>
            </section>
          )}

          {lastWorkout && (
            <section className="border-t border-[#D2CFC7] pt-6">
              <h2 className="eyebrow">Last completed session</h2>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <div><p className="font-semibold">{lastWorkout.title}</p><p className="mt-1 text-sm text-stone-500">{formatDate(lastWorkout.date)}</p></div>
                <Link to={appPaths.history} className="btn-secondary">View history</Link>
              </div>
            </section>
          )}
        </>
      )}
      {import.meta.env.DEV && (
        <details className="border-t border-[#D2CFC7] pt-5 text-sm text-stone-500">
          <summary className="w-fit cursor-pointer">Development tools</summary>
          <button type="button" disabled={seeding} onClick={seedDemoData} className="btn-secondary mt-4">{seeding ? 'Creating...' : 'Create Demo Data'}</button>
        </details>
      )}
    </section>
  );
}

export default Dashboard;
