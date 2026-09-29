import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { dashboardService } from '../../services/dashboardService';
import { demoService } from '../../services/demoService';
import { trainingMaxService } from '../../services/trainingMaxService';
import { appPaths } from '../../utils/navigation';
import { formatHomeDate, getHomeTrainingState, getHomeWorkoutSummary } from '../../utils/homeTraining';

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
      else setError('Unable to load your training. Please try again.');
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
  const {
    configuredLiftCount, strengthReady, currentWeek, weekNumber, weekComplete,
    nextWeekNumber, nextWeekMaxesReady, nextWorkout,
  } = getHomeTrainingState(trainingMaxes, weeks);
  const workoutSummary = nextWorkout ? getHomeWorkoutSummary(nextWorkout) : null;
  const lastWorkout = dashboard?.lastWorkout?.status === 'completed' ? dashboard.lastWorkout : null;
  const steps = [
    { label: 'Set your strength', copy: 'Enter a one-rep max for Squat, Bench Press, Deadlift, and Overhead Press.', status: strengthReady ? 'Complete' : 'Current step' },
    { label: 'Generate your program', copy: 'Build your first four-day training week from your strength numbers.', status: strengthReady ? 'Current step' : 'Up next' },
    { label: 'Start training', copy: 'Open your first session and record the sets you complete.', status: 'Up next' },
  ];
  const programHeading = weekComplete
    ? (weekNumber === 4 ? 'Training block complete.' : `Week ${weekNumber} complete.`)
    : 'Review your training week.';
  const programCopy = nextWeekNumber
    ? (nextWeekMaxesReady
      ? `Your strength numbers are saved for Week ${nextWeekNumber}. Open Program to generate your next week.`
      : `Enter updated strength numbers in Program to prepare Week ${nextWeekNumber}.`)
    : weekComplete
      ? 'All four weeks are complete. Review your training block in Program or your sessions in History.'
      : 'No planned sessions remain in this week. Open Program to review your training days.';

  return (
    <section className="page-stack">
      <header>
        <p className="eyebrow text-[#62675f]">Home</p>
        <h1 className="mt-2 break-words text-3xl font-semibold leading-tight sm:text-4xl">Welcome{user?.firstName ? `, ${user.firstName}` : ' back'}.</h1>
      </header>

      {error && <div role="alert" className="status-error">{error} <button type="button" onClick={() => { setLoading(true); loadDashboard(); }} className="ml-2 inline-flex min-h-11 items-center underline">Retry</button></div>}
      {success && <p role="status" className="status-success">{success}</p>}

      {loading ? (
        <div className="space-y-5 border-y border-[#D2CFC7] py-8 motion-safe:animate-pulse" role="status" aria-label="Loading your training">
          <div className="h-3 w-24 rounded bg-[#D2CFC7]" />
          <div className="h-9 w-3/4 max-w-md rounded bg-[#D2CFC7]" />
          <div className="h-4 w-1/2 max-w-xs rounded bg-[#D2CFC7]" />
          <span className="sr-only">Loading your training...</span>
        </div>
      ) : dashboard && (
        <>
          {currentWeek ? (
            <section aria-labelledby="next-training-heading">
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D2CFC7] pt-6">
                <p className="eyebrow text-[#62675f]">Week {weekNumber} <span className="font-normal">/ 4</span></p>
                {nextWorkout && <p className="text-sm text-[#62675f]">Planned for {formatHomeDate(nextWorkout.date)}</p>}
              </div>
              <div className="pb-8 pt-8 sm:pb-10">
                <p className="text-sm font-medium text-[#62675f]">{nextWorkout ? 'Next workout' : 'Your next step'}</p>
                <h2 id="next-training-heading" className="mt-3 max-w-3xl break-words text-3xl font-semibold leading-tight sm:text-4xl">
                  {workoutSummary?.title || programHeading}
                </h2>
                {workoutSummary ? (
                  <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#62675f]">
                    <div><dt className="sr-only">Exercises</dt><dd>{workoutSummary.exerciseCount} {workoutSummary.exerciseCount === 1 ? 'exercise' : 'exercises'}</dd></div>
                    {workoutSummary.mainLift && <div className="flex min-w-0 gap-1"><dt className="shrink-0">Main lift:</dt><dd className="break-words font-medium text-[#151714]">{workoutSummary.mainLift}</dd></div>}
                  </dl>
                ) : <p className="mt-4 max-w-xl text-sm leading-6 text-[#62675f]">{programCopy}</p>}
                <Link to={appPaths.program} className="btn-primary mt-7 min-h-11 h-auto py-3">{weekComplete && weekNumber === 4 ? 'Review Program' : 'Continue Program'}</Link>
              </div>
              <div className="flex flex-wrap gap-x-6 border-t border-[#D2CFC7] pt-3 text-sm font-medium">
                <Link to={appPaths.calendar} className="inline-flex min-h-11 items-center underline underline-offset-4">View Calendar</Link>
                <Link to={appPaths.program} className="inline-flex min-h-11 items-center underline underline-offset-4">Update Strength Numbers</Link>
              </div>
            </section>
          ) : (
            <section className="border-t border-[#D2CFC7] pt-8" aria-labelledby="getting-started-heading">
              <h2 id="getting-started-heading" className="text-2xl font-semibold sm:text-3xl">No program yet.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#62675f] sm:text-base">
                {strengthReady ? 'Your strength numbers are ready. Generate your first four-day training week in Program.' : 'Enter your strength numbers to generate your first training block.'}
              </p>
              <Link to={appPaths.program} className="btn-primary mt-6 min-h-11 h-auto py-3">{strengthReady ? 'Generate Program' : configuredLiftCount ? 'Continue Setup' : 'Set Up Program'}</Link>
              <ol aria-label="Program setup" className="mt-8 divide-y divide-[#D2CFC7] border-y border-[#D2CFC7]">
                {steps.map((step, index) => (
                  <li key={step.label} aria-current={step.status === 'Current step' ? 'step' : undefined} className="flex items-start gap-4 py-5 sm:gap-6">
                    <span aria-hidden="true" className="pt-1 text-sm tabular-nums text-[#62675f]">0{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                        <h3 className="font-semibold">{step.label}</h3>
                        <span className="text-xs text-[#62675f]">{step.status}</span>
                      </div>
                      {index === 0 && <p className="mt-2 text-sm font-medium tabular-nums">{configuredLiftCount} / 4 lifts configured</p>}
                      <p className="mt-2 max-w-xl text-sm leading-6 text-[#62675f]">{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to={appPaths.templates} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">Prefer a custom workout? Choose a template</Link>
            </section>
          )}

          {(lastWorkout || currentWeek) && (
            <section className="border-t border-[#D2CFC7] pt-6">
              <h2 className="eyebrow text-[#62675f]">Recent activity</h2>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{lastWorkout ? lastWorkout.title : `Week ${weekNumber} generated`}</p>
                  <p className="mt-2 text-sm text-[#62675f]">{lastWorkout ? `Completed ${formatHomeDate(lastWorkout.date)}` : formatHomeDate(currentWeek.generatedAt || currentWeek.dateCreated)}</p>
                </div>
                {lastWorkout && <Link to={appPaths.history} className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">View History</Link>}
              </div>
            </section>
          )}
        </>
      )}
      {import.meta.env.DEV && (
        <details className="border-t border-[#D2CFC7] pt-5 text-sm text-[#62675f]">
          <summary className="w-fit cursor-pointer">Development tools</summary>
          <button type="button" disabled={seeding} onClick={seedDemoData} className="btn-secondary mt-4">{seeding ? 'Creating...' : 'Create Demo Data'}</button>
        </details>
      )}
    </section>
  );
}

export default Dashboard;
