import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressChart from '../../components/ProgressChart/ProgressChart.jsx';
import WorkoutCard from '../../components/WorkoutCard/WorkoutCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { coachService } from '../../services/coachService.js';
import { dashboardService } from '../../services/dashboardService.js';
import { demoService } from '../../services/demoService.js';
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

const insightPriority = {
  high: 3,
  medium: 2,
  low: 1,
};

function Dashboard() {
  const { logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [coachInsights, setCoachInsights] = useState([]);
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
  const [seedingDemo, setSeedingDemo] = useState(false);
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

  const topCoachInsights = useMemo(
    () =>
      [...coachInsights]
        .sort((a, b) => (insightPriority[b.priority] || 0) - (insightPriority[a.priority] || 0))
        .slice(0, 3),
    [coachInsights],
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
      const [response, coachResponse] = await Promise.all([
        dashboardService.getDashboard(),
        coachService.getCoachInsights().catch((err) => {
          if (err.response?.status === 401) {
            throw err;
          }

          return { data: [] };
        }),
      ]);
      const data = response.data;
      const loadedTrainingMaxes = data.currentTrainingMaxes || [];

      setDashboardData(data);
      setCoachInsights(coachResponse.data || []);
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

  const seedDemoData = async () => {
    setError('');
    setSuccess('');
    setSeedingDemo(true);

    try {
      const response = await demoService.seedDemoData();
      setSuccess(response.data?.message || 'Demo data created for this account.');
      await loadDashboard();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to create demo data.'));
    } finally {
      setSeedingDemo(false);
    }
  };

  const user = dashboardData?.user;

  return (
    <section className="page-stack">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Training Overview</p>
          <h1 className="page-title">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="page-copy">
            {user?.fitnessGoal || 'Set your fitness goal'} · Week {dashboardData?.currentWeek || 1}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={seedDemoData}
              disabled={seedingDemo}
              className="btn-secondary"
            >
              {seedingDemo ? 'Creating demo data...' : 'Seed Demo Data'}
            </button>
          )}
          <div className="border-l border-stone-800 pl-4 text-sm text-stone-400">
            <span className="block text-2xl font-semibold text-stone-50">{trainingMaxes.length}/4</span>
            lifts configured
          </div>
        </div>
      </div>

      <Link
        to="/strength-program"
        className="btn-primary"
      >
        Open Strength Program Setup
      </Link>

      {error && (
        <p role="alert" className="status-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="status-success">
          {success}
        </p>
      )}

      {loading ? (
        <p className="empty-state">Loading dashboard...</p>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-4">
            {lifts.map((lift) => {
              const trainingMax = trainingMaxByLift[lift.key];

              return (
                <article key={lift.key} className="metric-panel">
                  <h2 className="font-semibold text-stone-50">{lift.label}</h2>
                  <dl className="mt-3 space-y-3 text-sm text-stone-300">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-stone-500">1RM</dt>
                      <dd className="font-medium text-stone-100">{trainingMax?.oneRepMax || 0} lb</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-stone-500">Training Max</dt>
                      <dd className="font-medium text-stone-100">{trainingMax?.trainingMax || 0} lb</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-stone-500">Current Week</dt>
                      <dd className="font-medium text-stone-100">{trainingMax?.currentWeek || 1}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <form onSubmit={saveOneRepMaxes} className="quiet-card">
                <h2 className="section-title">1RM Setup</h2>
                <p className="section-copy">
                  Add your 1RM values to generate your first program.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {lifts.map((lift) => (
                    <label key={lift.key} className="block">
                      <span className="text-sm font-medium text-stone-300">{lift.label} 1RM</span>
                      <input
                        type="number"
                        min="0"
                        value={oneRepMaxes[lift.key]}
                        onChange={(event) => handleOneRepMaxChange(lift.key, event.target.value)}
                        className="form-field"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary mt-6"
                >
                  {saving ? 'Saving...' : 'Save 1RMs'}
                </button>
              </form>

              <section className="grid gap-6 md:grid-cols-2">
                <div className="quiet-card">
                  <h2 className="section-title">Generate Program</h2>
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-stone-300">Week</span>
                      <select
                        value={programWeek}
                        onChange={(event) => setProgramWeek(event.target.value)}
                        className="form-field"
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
                      className="btn-primary"
                    >
                      Generate Workouts
                    </button>
                  </div>
                </div>

                <form onSubmit={updateProgression} className="quiet-card">
                  <h2 className="section-title">Apply Progression</h2>
                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium text-stone-300">Lift</span>
                      <select
                        name="trainingMaxId"
                        value={progressionForm.trainingMaxId}
                        onChange={handleProgressionChange}
                        required
                        className="form-field"
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
                      <span className="text-sm font-medium text-stone-300">Plus-set reps</span>
                      <input
                        type="number"
                        name="plusSetReps"
                        min="0"
                        value={progressionForm.plusSetReps}
                        onChange={handleProgressionChange}
                        required
                        className="form-field"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-stone-300">Notes</span>
                      <input
                        type="text"
                        name="notes"
                        value={progressionForm.notes}
                        onChange={handleProgressionChange}
                        className="form-field"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={saving || trainingMaxes.length === 0}
                    className="btn-accent mt-6"
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
                  colorClass="bg-stone-500"
                  emptyMessage="Log your first workout to see weekly volume."
                />
                <ProgressChart
                  title="Training Max Progress"
                  data={strengthProgressionChartData}
                  colorClass="bg-amber-300"
                  emptyMessage="Log your first workout to see strength progression."
                />
              </section>
            </div>

            <aside className="space-y-6">
              <section>
                <h2 className="section-title">Next Workout</h2>
                <div className="mt-4">
                  {dashboardData?.nextWorkout ? (
                    <WorkoutCard workout={dashboardData.nextWorkout} showActions={false} />
                  ) : (
                    <p className="empty-state">
                      Add your 1RM values to generate your first program.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h2 className="section-title">Last Workout</h2>
                <div className="mt-4">
                  {dashboardData?.lastWorkout ? (
                    <WorkoutCard workout={dashboardData.lastWorkout} showActions={false} />
                  ) : (
                    <p className="empty-state">
                      Log your first workout to see strength progression.
                    </p>
                  )}
                </div>
              </section>

              <section className="quiet-card">
                <h2 className="font-semibold text-stone-50">PR Summary</h2>
                {dashboardData?.recentPRs?.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {dashboardData.recentPRs.map((pr) => (
                      <div key={pr._id} className="border-b border-stone-800 pb-3 last:border-0 last:pb-0">
                        <p className="font-medium text-stone-100">{pr.exerciseName}</p>
                        <p className="text-sm text-stone-400">
                          {pr.weight} x {pr.reps} · Est. 1RM {pr.estimatedOneRepMax || pr.oneRepMax || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-400">PRs will appear after you log records.</p>
                )}
              </section>

              <section className="quiet-card">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-stone-50">Coach Insights</h2>
                  <Link to="/coach" className="text-sm font-medium text-stone-400 hover:text-stone-100">
                    View all
                  </Link>
                </div>
                {topCoachInsights.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {topCoachInsights.map((insight) => (
                      <div key={`${insight.type}-${insight.title}`} className="border-b border-stone-800 pb-3 last:border-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="font-medium text-stone-100">{insight.title}</p>
                          <span className="text-xs uppercase tracking-[0.16em] text-stone-500">{insight.priority}</span>
                        </div>
                        <p className="mt-1 text-sm text-stone-400">{insight.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-400">Log training, PRs, and progress to unlock coach insights.</p>
                )}
              </section>

              <section className="quiet-card">
                <h2 className="font-semibold text-stone-50">Smart Recommendations</h2>
                {dashboardData?.recentRecommendations?.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {dashboardData.recentRecommendations.map((recommendation) => (
                      <div key={recommendation._id} className="border-b border-stone-800 pb-3 last:border-0 last:pb-0">
                        <p className="font-medium text-stone-100">{recommendation.title}</p>
                        <p className="mt-1 text-sm text-stone-400">{recommendation.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-400">Recommendations will appear after progression updates.</p>
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
