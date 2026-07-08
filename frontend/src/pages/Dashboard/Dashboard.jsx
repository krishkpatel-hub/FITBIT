import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressChart from '../../components/ProgressChart/ProgressChart.jsx';
import WorkoutCard from '../../components/WorkoutCard/WorkoutCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { dashboardService } from '../../services/dashboardService.js';
import { trainingMaxService } from '../../services/trainingMaxService.js';

const lifts = [
  { key: 'squat', label: 'Squat' },
  { key: 'bench', label: 'Bench Press' },
  { key: 'deadlift', label: 'Deadlift' },
  { key: 'overhead_press', label: 'Overhead Press' },
];

const emptyOneRepMaxes = lifts.reduce((values, lift) => {
  values[lift.key] = '';
  return values;
}, {});

const numberOrZero = (value) => (value === '' ? 0 : Number(value));
const hasPositiveNumber = (value) => value !== '' && Number(value) > 0;

const formatDate = (date) => {
  if (!date) return 'No date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

function Dashboard() {
  const { logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [trainingMaxes, setTrainingMaxes] = useState([]);
  const [oneRepMaxes, setOneRepMaxes] = useState(emptyOneRepMaxes);
  const [progressionForm, setProgressionForm] = useState({
    trainingMaxId: '',
    plusSetReps: '',
    notes: '',
  });
  const [programWeek, setProgramWeek] = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const trainingMaxByLift = useMemo(
    () =>
      trainingMaxes.reduce((lookup, trainingMax) => {
        lookup[trainingMax.liftName] = trainingMax;
        return lookup;
      }, {}),
    [trainingMaxes],
  );

  const bodyWeightChartData = useMemo(
    () =>
      [...(dashboardData?.progressHistory || [])]
        .reverse()
        .map((entry) => ({
          label: formatDate(entry.date),
          value: entry.bodyWeight || 0,
        }))
        .slice(-8),
    [dashboardData],
  );

  const weeklyVolumeChartData = useMemo(
    () =>
      (dashboardData?.weeklyWorkoutVolume || []).map((entry) => ({
        label: formatDate(entry.week),
        value: entry.totalVolume || 0,
      })),
    [dashboardData],
  );

  const strengthProgressionChartData = useMemo(
    () =>
      (dashboardData?.strengthProgression || [])
        .slice(-8)
        .map((entry) => ({
          label: `${entry.liftLabel.split(' ')[0]} W${entry.week}`,
          value: entry.trainingMax || 0,
        })),
    [dashboardData],
  );

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return err.response?.data?.message || fallbackMessage;
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await dashboardService.getDashboard();
      const data = response.data;
      const loadedTrainingMaxes = data.currentTrainingMaxes || [];

      setDashboardData(data);
      setTrainingMaxes(loadedTrainingMaxes);
      setOneRepMaxes(
        lifts.reduce((values, lift) => {
          const existing = loadedTrainingMaxes.find((trainingMax) => trainingMax.liftName === lift.key);
          values[lift.key] = existing?.oneRepMax ?? '';
          return values;
        }, {}),
      );
      setProgressionForm((current) => ({
        ...current,
        trainingMaxId: current.trainingMaxId || loadedTrainingMaxes[0]?._id || '',
      }));
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load dashboard data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleOneRepMaxChange = (liftName, value) => {
    setOneRepMaxes((current) => ({
      ...current,
      [liftName]: value,
    }));
  };

  const saveOneRepMaxes = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const enteredLifts = lifts.filter((lift) => oneRepMaxes[lift.key] !== '');

    if (enteredLifts.length === 0) {
      setError('Enter at least one 1RM value before saving.');
      return;
    }

    if (enteredLifts.some((lift) => !hasPositiveNumber(oneRepMaxes[lift.key]))) {
      setError('1RM values must be greater than 0.');
      return;
    }

    setSaving(true);

    try {
      await Promise.all(
        enteredLifts.map((lift) => {
            const existing = trainingMaxByLift[lift.key];
            const payload = {
              liftName: lift.key,
              oneRepMax: numberOrZero(oneRepMaxes[lift.key]),
            };

            return existing
              ? trainingMaxService.updateTrainingMax(existing._id, payload)
              : trainingMaxService.createTrainingMax(payload);
          }),
      );

      setSuccess('One-rep maxes and training maxes saved.');
      await loadDashboard();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save one-rep maxes.'));
    } finally {
      setSaving(false);
    }
  };

  const generateProgram = async () => {
    setError('');
    setSuccess('');

    if (trainingMaxes.length === 0) {
      setError('Save at least one training max before generating a program.');
      return;
    }

    setSaving(true);

    try {
      const response = await trainingMaxService.generateProgram({ week: Number(programWeek) });
      setSuccess(`Generated ${response.data.length} workouts for week ${programWeek}.`);
      await loadDashboard();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to generate program.'));
    } finally {
      setSaving(false);
    }
  };

  const handleProgressionChange = (event) => {
    const { name, value } = event.target;
    setProgressionForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateProgression = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!progressionForm.trainingMaxId) {
      setError('Select a lift before applying progression.');
      return;
    }

    if (progressionForm.plusSetReps === '' || Number(progressionForm.plusSetReps) < 0) {
      setError('Enter plus-set reps as 0 or greater.');
      return;
    }

    try {
      setSaving(true);
      const response = await trainingMaxService.updateProgression({
        trainingMaxId: progressionForm.trainingMaxId,
        plusSetReps: numberOrZero(progressionForm.plusSetReps),
        notes: progressionForm.notes,
      });

      setSuccess(`Progression updated. Increase: ${response.data.increaseAmount} lb.`);
      setProgressionForm((current) => ({ ...current, plusSetReps: '', notes: '' }));
      await loadDashboard();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to update progression.'));
    } finally {
      setSaving(false);
    }
  };

  const user = dashboardData?.user;
  const nutritionToday = dashboardData?.nutritionToday;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Smart Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="mt-2 text-slate-400">
            {user?.fitnessGoal || 'Set your fitness goal'} · Week {dashboardData?.currentWeek || 1}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
          <span className="font-medium text-slate-50">{trainingMaxes.length}/4</span> lifts configured
        </div>
      </div>

      <Link
        to="/strength-program"
        className="inline-flex rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-white"
      >
        Open Strength Program Setup
      </Link>

      {error && (
        <p role="alert" className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-md bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {success}
        </p>
      )}

      {loading ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">Loading dashboard...</p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {lifts.map((lift) => {
              const trainingMax = trainingMaxByLift[lift.key];

              return (
                <article key={lift.key} className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                  <h2 className="font-semibold text-slate-50">{lift.label}</h2>
                  <dl className="mt-3 space-y-2 text-sm text-slate-300">
                    <div>
                      <dt className="inline text-slate-500">1RM: </dt>
                      <dd className="inline font-medium text-slate-100">{trainingMax?.oneRepMax || 0} lb</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-500">Training Max: </dt>
                      <dd className="inline font-medium text-slate-100">{trainingMax?.trainingMax || 0} lb</dd>
                    </div>
                    <div>
                      <dt className="inline text-slate-500">Current Week: </dt>
                      <dd className="inline font-medium text-slate-100">{trainingMax?.currentWeek || 1}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <form onSubmit={saveOneRepMaxes} className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
                <h2 className="text-xl font-semibold text-slate-50">1RM Setup</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Add your 1RM values to generate your first program.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {lifts.map((lift) => (
                    <label key={lift.key} className="block">
                      <span className="text-sm font-medium text-slate-300">{lift.label} 1RM</span>
                      <input
                        type="number"
                        min="0"
                        value={oneRepMaxes[lift.key]}
                        onChange={(event) => handleOneRepMaxChange(lift.key, event.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-6 rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900"
                >
                  {saving ? 'Saving...' : 'Save 1RMs'}
                </button>
              </form>

              <section className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
                  <h2 className="text-xl font-semibold text-slate-50">Generate Program</h2>
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-300">Week</span>
                      <select
                        value={programWeek}
                        onChange={(event) => setProgramWeek(event.target.value)}
                        className="mt-1 rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="1">Week 1</option>
                        <option value="2">Week 2</option>
                        <option value="3">Week 3</option>
                        <option value="4">Week 4 Deload</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={generateProgram}
                      disabled={saving || trainingMaxes.length === 0}
                      className="rounded-md bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      Generate Workouts
                    </button>
                  </div>
                </div>

                <form onSubmit={updateProgression} className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
                  <h2 className="text-xl font-semibold text-slate-50">Apply Progression</h2>
                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-300">Lift</span>
                      <select
                        name="trainingMaxId"
                        value={progressionForm.trainingMaxId}
                        onChange={handleProgressionChange}
                        required
                        className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Select lift</option>
                        {trainingMaxes.map((trainingMax) => (
                          <option key={trainingMax._id} value={trainingMax._id}>
                            {lifts.find((lift) => lift.key === trainingMax.liftName)?.label || trainingMax.liftName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-300">Plus-set reps</span>
                      <input
                        type="number"
                        name="plusSetReps"
                        min="0"
                        value={progressionForm.plusSetReps}
                        onChange={handleProgressionChange}
                        required
                        className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-300">Notes</span>
                      <input
                        type="text"
                        name="notes"
                        value={progressionForm.notes}
                        onChange={handleProgressionChange}
                        className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={saving || trainingMaxes.length === 0}
                    className="mt-6 rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900"
                  >
                    Apply Progression
                  </button>
                </form>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <ProgressChart
                  title="Body Weight"
                  data={bodyWeightChartData}
                  emptyMessage="Log your first progress entry to see body weight trends."
                />
                <ProgressChart
                  title="Weekly Workout Volume"
                  data={weeklyVolumeChartData}
                  colorClass="bg-slate-700"
                  emptyMessage="Log your first workout to see weekly volume."
                />
                <ProgressChart
                  title="Training Max Progress"
                  data={strengthProgressionChartData}
                  colorClass="bg-emerald-500"
                  emptyMessage="Log your first workout to see strength progression."
                />
              </section>
            </div>

            <aside className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-slate-50">Next Workout</h2>
                <div className="mt-4">
                  {dashboardData?.nextWorkout ? (
                    <WorkoutCard workout={dashboardData.nextWorkout} showActions={false} />
                  ) : (
                    <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
                      Add your 1RM values to generate your first program.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-slate-50">Last Workout</h2>
                <div className="mt-4">
                  {dashboardData?.lastWorkout ? (
                    <WorkoutCard workout={dashboardData.lastWorkout} showActions={false} />
                  ) : (
                    <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
                      Log your first workout to see strength progression.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                <h2 className="font-semibold text-slate-50">Nutrition Today</h2>
                {nutritionToday?.meals?.length > 0 ? (
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Calories</dt>
                      <dd className="font-medium text-slate-100">{nutritionToday.totalCalories || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Protein</dt>
                      <dd className="font-medium text-slate-100">{nutritionToday.totalProtein || 0}g</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Carbs</dt>
                      <dd className="font-medium text-slate-100">{nutritionToday.totalCarbs || 0}g</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Fats</dt>
                      <dd className="font-medium text-slate-100">{nutritionToday.totalFats || 0}g</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">Log meals to track today’s nutrition.</p>
                )}
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                <h2 className="font-semibold text-slate-50">PR Summary</h2>
                {dashboardData?.recentPRs?.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {dashboardData.recentPRs.map((pr) => (
                      <div key={pr._id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <p className="font-medium text-slate-100">{pr.exerciseName}</p>
                        <p className="text-sm text-slate-400">
                          {pr.weight} x {pr.reps} · Est. 1RM {pr.estimatedOneRepMax || pr.oneRepMax || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">PRs will appear after you log records.</p>
                )}
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                <h2 className="font-semibold text-slate-50">Smart Recommendations</h2>
                {dashboardData?.recentRecommendations?.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {dashboardData.recentRecommendations.map((recommendation) => (
                      <div key={recommendation._id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <p className="font-medium text-slate-100">{recommendation.title}</p>
                        <p className="mt-1 text-sm text-slate-400">{recommendation.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">Recommendations will appear after progression updates.</p>
                )}
              </section>
            </aside>
          </section>
        </>
      )}
    </section>
  );
}

export default Dashboard;
