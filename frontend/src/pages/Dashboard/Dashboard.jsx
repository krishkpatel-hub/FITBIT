import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { dashboardService } from '../../services/dashboardService';
import { demoService } from '../../services/demoService';
import { trainingMaxService } from '../../services/trainingMaxService';

const lifts = [
  { key: 'squat', label: 'Squat' },
  { key: 'bench', label: 'Bench Press' },
  { key: 'deadlift', label: 'Deadlift' },
  { key: 'overhead_press', label: 'Overhead Press' },
];

const featureGuide = [
  {
    title: 'Strength Program',
    description: 'Your generated adaptive weekly strength plan.',
    to: '/strength-program',
  },
  {
    title: 'Templates',
    description: 'Build reusable workouts for sessions outside your Strength Program.',
    to: '/templates',
  },
  {
    title: 'Progress',
    description: 'Log workouts, personal records, and review your training history.',
    to: '/progress',
  },
  {
    title: 'Analytics',
    description: 'Explore deeper trends from your training data.',
    to: '/analytics',
  },
  {
    title: 'Coach',
    description: 'Get guidance based on your training information.',
    to: '/coach',
  },
];

const emptyOneRepMaxes = lifts.reduce((values, lift) => {
  values[lift.key] = '';
  return values;
}, {});

const numberOrZero = (value) => (value === '' ? 0 : Number(value));
const hasPositiveNumber = (value) => value !== '' && Number(value) > 0;

const formatDate = (date) => {
  if (!date) return 'Not scheduled';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [trainingMaxes, setTrainingMaxes] = useState([]);
  const [oneRepMaxes, setOneRepMaxes] = useState(emptyOneRepMaxes);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingProgram, setGeneratingProgram] = useState(false);
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

  const configuredLifts = useMemo(
    () => lifts.filter((lift) => hasPositiveNumber(oneRepMaxes[lift.key])).length,
    [oneRepMaxes],
  );

  const allLiftsConfigured = configuredLifts === lifts.length;
  const savedLifts = lifts.filter((lift) => Number(trainingMaxByLift[lift.key]?.oneRepMax) > 0).length;
  const allLiftsSaved = savedLifts === lifts.length;
  const hasGeneratedProgram = Boolean(dashboardData?.nextWorkout || dashboardData?.lastWorkout);
  const targetWeek = dashboardData?.currentWeek || 1;
  const nextWorkout = dashboardData?.nextWorkout;
  const user = dashboardData?.user;

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
      const loadedTrainingMaxes = data.currentTrainingMaxes || data.trainingMaxes || [];

      setDashboardData(data);
      setTrainingMaxes(loadedTrainingMaxes);
      setOneRepMaxes(
        lifts.reduce((values, lift) => {
          const existing = loadedTrainingMaxes.find((trainingMax) => trainingMax.liftName === lift.key);
          values[lift.key] = existing?.oneRepMax ?? '';
          return values;
        }, {}),
      );
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

      setSuccess('One-rep maxes saved. Training maxes are ready for your week.');
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

    if (!allLiftsSaved) {
      setError('Save all four 1RM values before generating your week.');
      return;
    }

    setGeneratingProgram(true);

    try {
      const response = await trainingMaxService.generateProgram({ week: Number(targetWeek) });
      const workoutsGenerated = response.data?.workouts?.length || response.data?.programWeek?.workouts?.length || 4;

      setSuccess(`Week ${targetWeek} generated successfully.`);
      await loadDashboard();
      navigate('/strength-program', {
        state: {
          generatedWeek: Number(targetWeek),
          workoutsGenerated,
        },
      });
    } catch (err) {
      setError(await handleApiError(err, 'Unable to generate program.'));
    } finally {
      setGeneratingProgram(false);
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

  if (loading) {
    return (
      <section className="dashboard-shell">
        <div className="dashboard-loader" aria-label="Loading dashboard">
          <div />
          <div />
          <div />
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-shell">
      <header className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Training dashboard</p>
          <h1 className="dashboard-title">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="dashboard-lede">
            Your strength program starts here. Enter your current one-rep maxes, generate your week, then follow the plan inside Strength Program.
          </p>
        </div>

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
      </header>

      {error && (
        <p role="alert" className="dashboard-alert dashboard-alert-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="dashboard-alert dashboard-alert-success">
          {success}
        </p>
      )}

      {hasGeneratedProgram ? (
        <section className="dashboard-program-summary" aria-labelledby="program-summary-title">
          <div>
            <p className="dashboard-step-label">Your program</p>
            <h2 id="program-summary-title" className="dashboard-section-title">
              Week {targetWeek}
            </h2>
            <p className="dashboard-muted">4 workouts generated from your current training maxes.</p>
          </div>

          <div className="dashboard-next-workout">
            <p className="dashboard-small-label">Next workout</p>
            <p className="dashboard-next-title">{nextWorkout?.title || 'Open your plan to continue'}</p>
            <p className="dashboard-muted">{formatDate(nextWorkout?.date)}</p>
          </div>

          <Link to="/strength-program" className="btn-secondary">
            Continue Strength Program
          </Link>
        </section>
      ) : (
        <p className="dashboard-start-note">Start by entering your current one-rep maxes.</p>
      )}

      <form onSubmit={saveOneRepMaxes} className="dashboard-step" aria-labelledby="strength-setup-title">
        <div className="dashboard-step-heading">
          <div>
            <p className="dashboard-step-label">01 / Set your strength</p>
            <h2 id="strength-setup-title" className="dashboard-section-title">
              Current one-rep maxes
            </h2>
          </div>
          <span className="dashboard-progress-pill">{configuredLifts} / 4 lifts configured</span>
        </div>

        <div className="dashboard-lift-grid">
          {lifts.map((lift) => (
            <label key={lift.key} className="dashboard-lift-field">
              <span>{lift.label}</span>
              <div>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={oneRepMaxes[lift.key]}
                  onChange={(event) => handleOneRepMaxChange(lift.key, event.target.value)}
                  placeholder="0"
                />
                <span aria-hidden="true">lb</span>
              </div>
              <small>
                Training max: {trainingMaxByLift[lift.key]?.trainingMax || 0} lb
              </small>
            </label>
          ))}
        </div>

        <div className="dashboard-actions">
          <button type="submit" disabled={saving} className="btn-secondary">
            {saving ? 'Saving...' : 'Save 1RMs'}
          </button>
          <p>Training maxes are calculated and stored after saving.</p>
        </div>
      </form>

      <section className="dashboard-step" aria-labelledby="generate-week-title">
        <div className="dashboard-step-heading">
          <div>
            <h2 id="generate-week-title" className="dashboard-step-label">02 / Generate your week</h2>
          </div>
          <span className={allLiftsSaved ? 'dashboard-ready-text' : 'dashboard-muted'}>
            {allLiftsSaved
              ? 'Your training maxes are ready.'
              : allLiftsConfigured
                ? 'Save your 1RMs first.'
                : 'Complete all four 1RM values first.'}
          </span>
        </div>

        <button
          type="button"
          onClick={generateProgram}
          disabled={generatingProgram || saving || !allLiftsSaved}
          className="btn-primary mt-6"
        >
          {generatingProgram ? `Generating Week ${targetWeek}...` : `Generate Week ${targetWeek}`}
        </button>
      </section>

      <section className="dashboard-step" aria-labelledby="start-training-title">
        <div className="dashboard-step-heading">
          <div>
            <p className="dashboard-step-label">03 / Start training</p>
            <h2 id="start-training-title" className="dashboard-section-title">
              Follow your plan
            </h2>
          </div>
          <Link to="/strength-program" className="dashboard-text-link">
            Open Strength Program
          </Link>
        </div>
      </section>

      <section className="dashboard-guide" aria-labelledby="explore-title">
        <div>
          <p className="dashboard-step-label">Explore GetJackedCoach</p>
          <h2 id="explore-title" className="dashboard-section-title">
            Dedicated pages for everything else
          </h2>
        </div>

        <div className="dashboard-guide-list">
          {featureGuide.map((item) => (
            <Link key={item.to} to={item.to} className="dashboard-guide-row">
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <span aria-hidden="true">-&gt;</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

export default Dashboard;
