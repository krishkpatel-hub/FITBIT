import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
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

const roundToNearestFive = (value) => Math.round(Number(value || 0) / 5) * 5;
const calculateTrainingMax = (oneRepMax) => roundToNearestFive(Number(oneRepMax || 0) * 0.9);
const numberOrZero = (value) => (value === '' ? 0 : Number(value));
const hasPositiveNumber = (value) => value !== '' && Number(value) > 0;

function StrengthProgram() {
  const { logout } = useAuth();
  const [trainingMaxes, setTrainingMaxes] = useState([]);
  const [oneRepMaxes, setOneRepMaxes] = useState(emptyOneRepMaxes);
  const [programWeek, setProgramWeek] = useState('1');
  const [generatedWorkouts, setGeneratedWorkouts] = useState([]);
  const [progressionForm, setProgressionForm] = useState({
    trainingMaxId: '',
    plusSetReps: '',
    notes: '',
  });
  const [progressionResult, setProgressionResult] = useState(null);
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

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return err.response?.data?.message || fallbackMessage;
  };

  const loadTrainingMaxes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await trainingMaxService.getTrainingMaxes();
      const loadedTrainingMaxes = response.data || [];

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
      setError(await handleApiError(err, 'Unable to load training maxes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainingMaxes();
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

      setSuccess('Training maxes saved.');
      await loadTrainingMaxes();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save training maxes.'));
    } finally {
      setSaving(false);
    }
  };

  const generateProgram = async () => {
    setError('');
    setSuccess('');
    setGeneratedWorkouts([]);

    if (trainingMaxes.length === 0) {
      setError('Save at least one training max before generating a program.');
      return;
    }

    setSaving(true);

    try {
      const response = await trainingMaxService.generateProgram({ week: Number(programWeek) });
      setGeneratedWorkouts(response.data || []);
      setSuccess(`Generated ${response.data.length} workouts for week ${programWeek}.`);
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
    setProgressionResult(null);

    if (!progressionForm.trainingMaxId) {
      setError('Select a lift before applying progression.');
      return;
    }

    if (progressionForm.plusSetReps === '' || Number(progressionForm.plusSetReps) < 0) {
      setError('Enter plus-set reps as 0 or greater.');
      return;
    }

    const selectedTrainingMax = trainingMaxes.find((trainingMax) => trainingMax._id === progressionForm.trainingMaxId);
    setSaving(true);

    try {
      const response = await trainingMaxService.updateProgression({
        trainingMaxId: progressionForm.trainingMaxId,
        plusSetReps: numberOrZero(progressionForm.plusSetReps),
        notes: progressionForm.notes,
      });

      setProgressionResult({
        oldTrainingMax: selectedTrainingMax?.trainingMax || 0,
        plusSetReps: numberOrZero(progressionForm.plusSetReps),
        increaseAmount: response.data.increaseAmount,
        newTrainingMax: response.data.trainingMax.trainingMax,
        recommendation: response.data.recommendation,
      });
      setSuccess('Progression updated.');
      setProgressionForm((current) => ({ ...current, plusSetReps: '', notes: '' }));
      await loadTrainingMaxes();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to update progression.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Adaptive Strength</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50">Strength Program Setup</h1>
          <p className="mt-2 text-slate-400">
            Set your 1RMs, generate weekly workouts, and progress training maxes from plus-set performance.
          </p>
        </div>
        <Link
          to="/workout"
          className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900/80"
        >
          View Workouts
        </Link>
      </div>

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
        <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">Loading strength setup...</p>
      ) : (
        <>
          <form onSubmit={saveOneRepMaxes} className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-slate-50">1RM Setup</h2>
            <p className="mt-1 text-sm text-slate-400">
              Enter your 1RM values to generate your first adaptive strength program.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {lifts.map((lift) => {
                const oneRepMax = oneRepMaxes[lift.key];
                const previewTrainingMax = calculateTrainingMax(oneRepMax);

                return (
                  <label key={lift.key} className="block">
                    <span className="text-sm font-medium text-slate-300">{lift.label} 1RM</span>
                    <input
                      type="number"
                      min="0"
                      value={oneRepMax}
                      onChange={(event) => handleOneRepMaxChange(lift.key, event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="mt-1 block text-xs text-slate-500">TM preview: {previewTrainingMax}</span>
                  </label>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900"
            >
              {saving ? 'Saving...' : 'Save Training Maxes'}
            </button>
          </form>

          <section className="grid gap-4 md:grid-cols-4">
            {lifts.map((lift) => {
              const trainingMax = trainingMaxByLift[lift.key];

              return (
                <article key={lift.key} className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                  <h2 className="text-lg font-semibold text-slate-50">{lift.label}</h2>
                  <dl className="mt-4 space-y-2 text-sm text-slate-300">
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

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-slate-50">Generate Weekly Program</h2>
              <p className="mt-1 text-sm text-slate-400">Generate your weekly program after saving your training maxes.</p>
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
                  className="w-full rounded-md bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
                >
                  {saving ? 'Working...' : 'Generate Program'}
                </button>
              </div>
            </div>

            <form onSubmit={updateProgression} className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-slate-50">Update Progression</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
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

                <label className="block md:col-span-2">
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
                {saving ? 'Working...' : 'Apply Progression'}
              </button>
            </form>
          </section>

          {progressionResult && (
            <section className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-slate-50">Progression Result</h2>
              <dl className="mt-4 grid gap-4 md:grid-cols-4">
                <div>
                  <dt className="text-sm text-slate-500">Old TM</dt>
                  <dd className="text-lg font-semibold text-slate-50">{progressionResult.oldTrainingMax}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Plus-set reps</dt>
                  <dd className="text-lg font-semibold text-slate-50">{progressionResult.plusSetReps}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Increase</dt>
                  <dd className="text-lg font-semibold text-slate-50">{progressionResult.increaseAmount} lb</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">New TM</dt>
                  <dd className="text-lg font-semibold text-slate-50">{progressionResult.newTrainingMax}</dd>
                </div>
              </dl>
              {progressionResult.recommendation && (
                <p className="mt-4 rounded-md bg-slate-800/60 px-3 py-2 text-sm text-slate-300">
                  <span className="font-medium">{progressionResult.recommendation.title}:</span>{' '}
                  {progressionResult.recommendation.message}
                </p>
              )}
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-50">Generated Program</h2>
            {generatedWorkouts.length === 0 ? (
              <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
                Generate your weekly program after saving your training maxes.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {generatedWorkouts.map((workout) => (
                  <article key={workout._id} className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-50">{workout.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{workout.notes}</p>
                      </div>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium capitalize text-slate-300">
                        {workout.status}
                      </span>
                    </div>

                    {workout.exercises?.map((exercise) => (
                      <div key={exercise.exerciseName} className="mt-4">
                        <h4 className="font-medium text-slate-100">{exercise.exerciseName}</h4>
                        <div className="mt-3 overflow-x-auto rounded-md border border-slate-800">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/60 text-xs uppercase text-slate-500">
                              <tr>
                                <th className="px-3 py-2">Set</th>
                                <th className="px-3 py-2">Percent</th>
                                <th className="px-3 py-2">Weight</th>
                                <th className="px-3 py-2">Reps</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {exercise.sets.map((set) => (
                                <tr key={set.setNumber}>
                                  <td className="px-3 py-2">{set.setNumber}</td>
                                  <td className="px-3 py-2">{set.percent || 0}%</td>
                                  <td className="px-3 py-2">{set.weight} lb</td>
                                  <td className="px-3 py-2 font-medium text-slate-100">
                                    {set.isPlusSet ? (
                                      <span className="rounded-full bg-emerald-950/40 px-2 py-1 text-xs font-semibold text-emerald-300">
                                        {set.targetReps}+
                                      </span>
                                    ) : (
                                      set.targetReps
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}

export default StrengthProgram;
