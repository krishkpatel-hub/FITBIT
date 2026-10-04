import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { trainingMaxService } from '../../services/trainingMaxService';
import { workoutService } from '../../services/workoutService';
import { appPaths } from '../../utils/navigation';
import { getUserFacingError } from '../../utils/apiError';

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
const hasPositiveNumber = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
const formatDate = (date) => {
  if (!date) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
};

const getLiftLabel = (liftName) => lifts.find((lift) => lift.key === liftName)?.label || liftName;

const getSetVolume = (set) => Number(set.weight || 0) * Number(set.targetReps || set.reps || 0);
const getWorkoutLiftName = (workout) => workout?.liftName || workout?.exercises?.[0]?.muscleGroup || '';
const getWorkoutDayLabel = (workout, index) => workout?.liftName ? getLiftLabel(workout.liftName) : workout?.title?.split(' - ')[1] || `Day ${index + 1}`;
const getWorkoutEstimatedVolume = (workout) =>
  workout?.exercises?.reduce(
    (workoutTotal, exercise) =>
      workoutTotal + (exercise.sets?.reduce((setTotal, set) => setTotal + getSetVolume(set), 0) || 0),
    0,
  ) || 0;

const isProgramWeekComplete = (programWeek) =>
  Boolean(programWeek?.workouts?.length >= 4 && programWeek.workouts.every((workout) => workout.status === 'completed'));

const getActiveProgramWeekNumber = (programWeeks) => {
  for (let week = 1; week <= 4; week += 1) {
    const programWeek = programWeeks.find((entry) => Number(entry.week) === week);

    if (!isProgramWeekComplete(programWeek)) {
      return week;
    }
  }

  return 4;
};

function StrengthProgram() {
  const { logout } = useAuth();
  const realtime = useRealtime();
  const location = useLocation();
  const generatedWeekFromNavigation = Number(location.state?.generatedWeek || 1);
  const [trainingMaxes, setTrainingMaxes] = useState([]);
  const [programWeeks, setProgramWeeks] = useState([]);
  const [oneRepMaxes, setOneRepMaxes] = useState(emptyOneRepMaxes);
  const [programWeek, setProgramWeek] = useState(String(generatedWeekFromNavigation >= 1 && generatedWeekFromNavigation <= 4 ? generatedWeekFromNavigation : 1));
  const [activeWorkoutIndex, setActiveWorkoutIndex] = useState(0);
  const [progressionForm, setProgressionForm] = useState({
    trainingMaxId: '',
    plusSetReps: '',
    notes: '',
  });
  const [progressionResult, setProgressionResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const setRequestRef = useRef(false);
  const [operation, setOperation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingMaxes, setEditingMaxes] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const trainingMaxByLift = useMemo(
    () =>
      trainingMaxes.reduce((lookup, trainingMax) => {
        lookup[trainingMax.liftName] = trainingMax;
        return lookup;
      }, {}),
    [trainingMaxes],
  );

  const selectedProgramWeek = useMemo(
    () => programWeeks.find((weekEntry) => Number(weekEntry.week) === Number(programWeek)),
    [programWeek, programWeeks],
  );
  const activeProgramWeekNumber = useMemo(() => getActiveProgramWeekNumber(programWeeks), [programWeeks]);
  const selectedWeekComplete = isProgramWeekComplete(selectedProgramWeek);
  const selectedWeekLocked = Number(programWeek) > activeProgramWeekNumber;
  const selectedWeekReadOnly = selectedWeekComplete || Number(programWeek) < activeProgramWeekNumber;
  const selectedWeekCanGenerate = Number(programWeek) === activeProgramWeekNumber && !selectedWeekComplete;
  const selectedWeekGenerated = Boolean(selectedProgramWeek?.workouts?.length);
  const selectedWeekMaxesReady = trainingMaxes.length === lifts.length &&
    trainingMaxes.every((trainingMax) => Number(trainingMax.currentWeek || 1) === Number(programWeek));
  const activeWeekWorkouts = selectedProgramWeek?.workouts?.length ? selectedProgramWeek.workouts : [];
  const activeWorkout = activeWeekWorkouts[activeWorkoutIndex] || activeWeekWorkouts[0];
  const activeLiftName = getWorkoutLiftName(activeWorkout);
  const selectionRef = useRef({ week: programWeek, day: activeWorkoutIndex });
  selectionRef.current = { week: programWeek, day: activeWorkoutIndex };
  const firstLoadRef = useRef(true);

  const selectedTrainingMax = useMemo(
    () =>
      trainingMaxByLift[activeLiftName] ||
      trainingMaxes.find((trainingMax) => trainingMax._id === progressionForm.trainingMaxId) ||
      trainingMaxes[0],
    [activeLiftName, progressionForm.trainingMaxId, trainingMaxByLift, trainingMaxes],
  );
  // Completing the last day must not prevent recording its plus-set result.
  // Once fresh maxes belong to a later week, this historical week stays locked.
  const selectedWeekCanProgress = !selectedWeekLocked && selectedWeekGenerated &&
    Number(selectedTrainingMax?.currentWeek || 0) === Number(programWeek);

  const currentWeek = activeProgramWeekNumber;

  const latestUpdatedAt = useMemo(() => {
    const dates = trainingMaxes
      .map((trainingMax) => trainingMax.lastUpdated || trainingMax.updatedAt || trainingMax.createdAt)
      .filter(Boolean)
      .map((date) => new Date(date).getTime());

    return dates.length > 0 ? new Date(Math.max(...dates)) : null;
  }, [trainingMaxes]);

  const historyItems = useMemo(
    () => [...programWeeks].sort((a, b) => Number(a.week) - Number(b.week)),
    [programWeeks],
  );

  const todaysWorkout = activeWorkout;

  const programWeekOptions = [1, 2, 3, 4].map((week) => ({
    week,
    label: week === 4 ? 'Week 4' : `Week ${week}`,
    suffix: week === 4 ? 'Deload' : '',
    status: isProgramWeekComplete(programWeeks.find((entry) => Number(entry.week) === week))
      ? 'Completed'
      : week === activeProgramWeekNumber
        ? 'Current'
        : 'Locked',
    detail:
      week > activeProgramWeekNumber
        ? `Unlocks after Week ${week - 1} is completed.`
        : week === 4
          ? 'Deload week'
          : '',
    locked: week > activeProgramWeekNumber,
  }));

  const visibleProgressionResult = progressionResult?.liftName === activeLiftName && progressionResult?.week === Number(programWeek)
    ? progressionResult : null;

  const syncOneRepMaxesForWeek = (loadedTrainingMaxes = trainingMaxes, week = Number(programWeek)) => {
    const maxesReadyForSelectedWeek = loadedTrainingMaxes.length === lifts.length &&
      loadedTrainingMaxes.every((trainingMax) => Number(trainingMax.currentWeek || 1) === Number(week));

    return lifts.reduce((values, lift) => {
      const existing = loadedTrainingMaxes.find((trainingMax) => trainingMax.liftName === lift.key);
      values[lift.key] = maxesReadyForSelectedWeek || Number(week) === 1 ? existing?.oneRepMax ?? '' : '';
      return values;
    }, {});
  };

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return getUserFacingError(err, fallbackMessage);
  };

  const loadTrainingMaxes = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');

    try {
      const [response, programWeeksResponse] = await Promise.all([
        trainingMaxService.getTrainingMaxes(),
        trainingMaxService.getProgramWeeks(),
      ]);
      const loadedTrainingMaxes = response.data || [];
      const loadedProgramWeeks = programWeeksResponse.data || [];
      const activeWeek = getActiveProgramWeekNumber(loadedProgramWeeks);
      const requestedWeek = firstLoadRef.current && !location.state?.generatedWeek ? activeWeek : Number(selectionRef.current.week);
      const nextSelectedWeek = Math.min(requestedWeek, activeWeek);
      const selectedWeekEntry = loadedProgramWeeks.find((weekEntry) => Number(weekEntry.week) === nextSelectedWeek);
      const maxesReadyForSelectedWeek = loadedTrainingMaxes.length === lifts.length &&
        loadedTrainingMaxes.every((trainingMax) => Number(trainingMax.currentWeek || 1) === nextSelectedWeek);

      setProgramWeek(String(nextSelectedWeek));
      setTrainingMaxes(loadedTrainingMaxes);
      setProgramWeeks(loadedProgramWeeks);
      setActiveWorkoutIndex((index) => Math.min(index, Math.max(0, (selectedWeekEntry?.workouts?.length || 1) - 1)));
      firstLoadRef.current = false;
      setOneRepMaxes(syncOneRepMaxesForWeek(loadedTrainingMaxes, nextSelectedWeek));
      setEditingMaxes(!maxesReadyForSelectedWeek && nextSelectedWeek === activeWeek);
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

  useEffect(() => {
    if (!realtime) return undefined;

    return realtime.subscribe(['workout.updated', 'workout.completed'], () => {
      loadTrainingMaxes({ quiet: true });
    });
  }, [realtime]);

  useEffect(() => {
    setActiveWorkoutIndex(0);
  }, [programWeek]);

  useEffect(() => {
    if (trainingMaxes.length === 0) {
      return;
    }

    const maxesReadyForSelectedWeek = trainingMaxes.length === lifts.length &&
      trainingMaxes.every((trainingMax) => Number(trainingMax.currentWeek || 1) === Number(programWeek));

    setOneRepMaxes(syncOneRepMaxesForWeek(trainingMaxes, Number(programWeek)));
    setEditingMaxes(!maxesReadyForSelectedWeek && Number(programWeek) === activeProgramWeekNumber);
  }, [programWeek, trainingMaxes]);

  useEffect(() => {
    if (!activeLiftName || !trainingMaxByLift[activeLiftName]) {
      return;
    }

    setProgressionForm((current) => ({
      ...current,
      trainingMaxId: trainingMaxByLift[activeLiftName]._id,
      plusSetReps: '',
      notes: '',
    }));
  }, [activeLiftName, trainingMaxByLift]);

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

    if (!selectedWeekCanGenerate) {
      setError(selectedWeekLocked ? `Complete Week ${activeProgramWeekNumber} to unlock Week ${programWeek}.` : 'Completed weeks are view-only.');
      return;
    }

    const enteredLifts = lifts.filter((lift) => oneRepMaxes[lift.key] !== '');

    if (enteredLifts.length !== lifts.length) {
      setError('Enter all four 1RM values before saving a program week.');
      return;
    }

    if (enteredLifts.some((lift) => !hasPositiveNumber(oneRepMaxes[lift.key]))) {
      setError('1RM values must be greater than 0.');
      return;
    }

    setSaving(true);
    setOperation('maxes');

    try {
      await Promise.all(
        enteredLifts.map((lift) => {
            const existing = trainingMaxByLift[lift.key];
            const payload = {
              liftName: lift.key,
              oneRepMax: numberOrZero(oneRepMaxes[lift.key]),
              currentWeek: Number(programWeek),
            };

            return existing
              ? trainingMaxService.updateTrainingMax(existing._id, payload)
              : trainingMaxService.createTrainingMax(payload);
          }),
      );

      setSuccess(`Week ${programWeek} maxes saved. Generate Week ${programWeek} when ready.`);
      setEditingMaxes(false);
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

    if (!selectedWeekCanGenerate) {
      setError(selectedWeekLocked ? `Complete Week ${activeProgramWeekNumber} to unlock Week ${programWeek}.` : 'Completed weeks are view-only.');
      return;
    }

    if (trainingMaxes.length === 0) {
      setError('Save at least one training max before generating a program.');
      return;
    }

    if (!selectedWeekMaxesReady) {
      setError(`Enter and save fresh maxes to generate Week ${programWeek}.`);
      return;
    }

    setSaving(true);
    setOperation('generate');

    try {
      const response = await trainingMaxService.generateProgram({ week: Number(programWeek) });
      const createdProgramWeek = response.data?.programWeek;
      setProgramWeeks((current) => {
        const withoutWeek = current.filter((weekEntry) => Number(weekEntry.week) !== Number(programWeek));
        return [...withoutWeek, createdProgramWeek].filter(Boolean).sort((a, b) => Number(a.week) - Number(b.week));
      });
      setActiveWorkoutIndex(0);
      setSuccess(`Generated 4 workouts for Week ${programWeek}.`);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to generate program.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSetCompletion = async (exerciseIndex, setIndex) => {
    if (setRequestRef.current || saving) return;
    if (selectedWeekReadOnly || selectedWeekLocked) {
      setError('Completed or locked weeks are view-only.');
      return;
    }

    if (!activeWorkout?._id) {
      setError('Save or generate this workout before marking sets complete.');
      return;
    }

    setError('');
    setSuccess('');

    const nextExercises = activeWorkout.exercises.map((exercise, currentExerciseIndex) => ({
      ...exercise,
      sets: exercise.sets.map((set, currentSetIndex) => {
        if (currentExerciseIndex !== exerciseIndex || currentSetIndex !== setIndex) {
          return set;
        }

        const completed = !set.completed;

        return {
          ...set,
          completed,
          reps: completed && !set.reps ? set.targetReps : set.reps,
        };
      }),
    }));
    const allSetsComplete = nextExercises.every((exercise) => exercise.sets.every((set) => set.completed));

    setRequestRef.current = true;
    setSavingSet(true);
    try {
      const response = await workoutService.updateWorkout(activeWorkout._id, {
        exercises: nextExercises,
        status: allSetsComplete ? 'completed' : 'planned',
      });
      const updatedWorkout = response.data;

      setProgramWeeks((current) =>
        current.map((weekEntry) => {
          if (Number(weekEntry.week) !== Number(programWeek)) {
            return weekEntry;
          }

          const workouts = weekEntry.workouts.map((workout) =>
            workout._id === updatedWorkout._id ? updatedWorkout : workout,
          );
          const isComplete = workouts.length >= 4 && workouts.every((workout) => workout.status === 'completed');

          return {
            ...weekEntry,
            workouts,
            status: isComplete ? 'completed' : 'planned',
          };
        }),
      );

      if (allSetsComplete) {
        const updatedWeek = activeWeekWorkouts.map((workout) =>
          workout._id === updatedWorkout._id ? updatedWorkout : workout,
        );
        const weekIsComplete = updatedWeek.length >= 4 && updatedWeek.every((workout) => workout.status === 'completed');

        setSuccess(
          weekIsComplete && Number(programWeek) < 4
            ? `Week ${programWeek} complete. Enter updated maxes to generate Week ${Number(programWeek) + 1}.`
            : `${updatedWorkout.title} marked complete.`,
        );
      }
    } catch (err) {
      setError(await handleApiError(err, 'Unable to update workout completion.'));
    } finally {
      setRequestRef.current = false;
      setSavingSet(false);
    }
  };

  const handleProgressionChange = (event) => {
    const { name, value } = event.target;
    setProgressionForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const cancelMaxEditing = () => {
    setError('');
    setOneRepMaxes(syncOneRepMaxesForWeek(trainingMaxes, Number(programWeek)));
    setEditingMaxes(false);
  };

  const updateProgression = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setProgressionResult(null);

    if (!selectedWeekCanProgress) {
      setError('Progression is only available for the week these training maxes belong to.');
      return;
    }

    const activeTrainingMaxId = activeLiftName ? trainingMaxByLift[activeLiftName]?._id : progressionForm.trainingMaxId;

    if (!activeTrainingMaxId) {
      setError('Select a lift before applying progression.');
      return;
    }

    if (progressionForm.plusSetReps === '' || !Number.isInteger(Number(progressionForm.plusSetReps)) || Number(progressionForm.plusSetReps) < 0) {
      setError('Enter plus-set reps as a whole number, 0 or greater.');
      return;
    }

    const selectedTrainingMax = trainingMaxes.find((trainingMax) => trainingMax._id === activeTrainingMaxId);
    setSaving(true);
    setOperation('progression');

    try {
      const response = await trainingMaxService.updateProgression({
        trainingMaxId: activeTrainingMaxId,
        plusSetReps: numberOrZero(progressionForm.plusSetReps),
        notes: progressionForm.notes,
      });

      setProgressionResult({
        liftName: activeLiftName,
        week: Number(programWeek),
        oldTrainingMax: selectedTrainingMax?.trainingMax || 0,
        plusSetReps: numberOrZero(progressionForm.plusSetReps),
        increaseAmount: response.data.increaseAmount,
        newTrainingMax: response.data.trainingMax.trainingMax,
        recommendation: response.data.recommendation,
      });
      setSuccess('Progression updated.');
      setProgressionForm((current) => ({ ...current, plusSetReps: '', notes: '' }));
      await loadTrainingMaxes({ quiet: true });
    } catch (err) {
      setError(await handleApiError(err, 'Unable to update progression.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-stack min-w-0">
      <header className="page-header">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="eyebrow">Current Block</p>
            <h1 className="page-title">Strength Program</h1>
            <p className="page-copy">
              Week {currentWeek} of 4 · Last updated {formatDate(latestUpdatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <p className="text-[#62675f]">Adaptive 5/3/1</p>
            <Link to={appPaths.calendar} className="btn-secondary min-h-11">
              View Calendar
            </Link>
          </div>
        </div>
      </header>

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
        <div className="grid gap-4 md:grid-cols-4" role="status" aria-label="Loading strength program">
          {lifts.map((lift) => (
            <div key={lift.key} className="skeleton-panel h-36" />
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-5" aria-labelledby="training-max-heading">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="training-max-heading" className="section-title">
                  Training Maxes
                </h2>
                <p className="section-copy">{selectedWeekReadOnly ? 'Saved strength numbers' : 'Strength numbers'} for Week {programWeek}. All weights in lb.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {!editingMaxes && selectedWeekCanGenerate && (
                  <button type="button" disabled={saving || savingSet} className="btn-secondary min-h-11" onClick={() => setEditingMaxes(true)}>
                    Edit Maxes
                  </button>
                )}
              </div>
            </div>

            {selectedWeekLocked && (
              <p className="empty-state">Complete Week {activeProgramWeekNumber} to unlock Week {programWeek}.</p>
            )}

            {selectedWeekCanGenerate && !selectedWeekGenerated && Number(programWeek) > 1 && !selectedWeekMaxesReady && (
              <p className="empty-state">Enter fresh maxes to generate Week {programWeek}.</p>
            )}

            <form onSubmit={saveOneRepMaxes} className="border-y border-stone-800" aria-label="Training maxes">
              <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
                {lifts.map((lift) => {
                  const trainingMax = selectedWeekReadOnly
                    ? selectedProgramWeek?.maxes?.[lift.key]
                    : trainingMaxByLift[lift.key];
                  const oneRepMax = oneRepMaxes[lift.key];
                  const previewTrainingMax = calculateTrainingMax(oneRepMax);

                  return (
                    <div key={lift.key} className="min-w-0 border-t border-stone-800 py-4 first:border-t-0 sm:[&:nth-child(2)]:border-t-0 lg:border-t-0">
                      <h3 className="text-base font-semibold text-stone-100">{lift.label}</h3>

                      {editingMaxes && selectedWeekCanGenerate ? (
                        <label className="mt-3 block">
                          <span className="text-sm font-medium text-stone-300">1RM (lb)</span>
                          <input
                            type="number"
                            min="1"
                            required
                            aria-label={`${lift.label} 1RM`}
                            disabled={saving}
                            value={oneRepMax}
                            onChange={(event) => handleOneRepMaxChange(lift.key, event.target.value)}
                            className="form-field"
                          />
                          <span className="mt-2 block text-sm text-[#62675f]">Training Max: <strong className="font-semibold text-stone-100">{previewTrainingMax} lb</strong></span>
                        </label>
                      ) : (
                        <dl className="mt-3 space-y-2 text-sm tabular-nums">
                          <div className="flex items-baseline justify-between gap-4">
                            <dt className="text-[#62675f]">1RM</dt>
                            <dd className="font-semibold text-stone-100">{trainingMax?.oneRepMax || 0} lb</dd>
                          </div>
                          <div className="flex items-baseline justify-between gap-4">
                            <dt className="text-[#62675f]">Training Max</dt>
                            <dd className="font-semibold text-stone-100">{trainingMax?.trainingMax || 0} lb</dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  );
                })}
              </div>

              {editingMaxes && selectedWeekCanGenerate && (
                <div className="flex flex-wrap items-center gap-3 border-t border-stone-800 py-5">
                  <button type="submit" disabled={saving} className="btn-primary min-h-11">
                    {saving && operation === 'maxes' ? 'Saving...' : 'Save Training Maxes'}
                  </button>
                  <button type="button" disabled={saving} className="btn-secondary min-h-11" onClick={cancelMaxEditing}>
                    Cancel
                  </button>
                  <p className="text-sm text-[#62675f]">Training Max uses 90% of 1RM, rounded to the nearest 5 lb.</p>
                </div>
              )}
            </form>
          </section>

          <section className="space-y-6" aria-labelledby="program-overview-heading">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="program-overview-heading" className="section-title">Select Week</h2>
                {selectedWeekCanGenerate && (
                  <button
                    type="button"
                    onClick={generateProgram}
                    disabled={saving || editingMaxes || !selectedWeekMaxesReady || !selectedWeekCanGenerate}
                    className={`${selectedWeekGenerated ? 'btn-secondary' : 'btn-primary'} min-h-11`}
                  >
                    {saving && operation === 'generate' ? 'Generating...' : selectedWeekGenerated ? `Regenerate Week ${programWeek}` : `Generate Week ${programWeek}`}
                  </button>
                )}
              </div>
              {selectedWeekComplete && Number(programWeek) < 4 && (
                <p className="status-success mt-4">
                  Week {programWeek} complete. Select Week {Number(programWeek) + 1} and enter updated maxes to generate it.
                </p>
              )}
              {selectedWeekLocked && (
                <p className="empty-state mt-4">Complete Week {activeProgramWeekNumber} to unlock Week {programWeek}.</p>
              )}
              <nav className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Program weeks">
                {programWeekOptions.map((week) => (
                  <button
                    key={week.week}
                    type="button"
                    onClick={() => {
                      if (!week.locked) {
                        setProgramWeek(String(week.week));
                      }
                    }}
                    disabled={saving || savingSet}
                    aria-disabled={week.locked}
                    aria-current={Number(programWeek) === week.week ? 'step' : undefined}
                    aria-label={`${week.label}: ${week.locked ? week.detail : week.status}${week.suffix ? `, ${week.suffix}` : ''}`}
                    title={week.locked ? week.detail : ''}
                    aria-describedby={week.locked ? `week-${week.week}-lock-reason` : undefined}
                    className={`group relative min-h-11 min-w-0 rounded-md border px-3 py-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4f46] ${
                      week.locked
                        ? 'cursor-not-allowed border-[#D2CFC7] bg-[#F4F2EC] text-[#747872]'
                        : Number(programWeek) === week.week
                        ? 'border-[#2f4f46] bg-[#E8EDE9] text-[#203c33]'
                        : 'border-[#D2CFC7] text-[#4F534E] hover:bg-[#F4F2EC]'
                    }`}
                  >
                    <span className="font-semibold">{week.label}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{week.suffix || week.status}</span>
                    {week.locked && (
                      <span
                        id={`week-${week.week}-lock-reason`}
                        role="tooltip"
                        className="pointer-events-none invisible absolute inset-x-0 top-full z-10 mt-2 rounded-md border border-[#D2CFC7] bg-[#FAF9F6] p-3 text-xs font-normal leading-5 text-[#4F534E] shadow-sm group-hover:visible group-focus-visible:visible"
                      >
                        {week.detail}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <section className="min-w-0" aria-label="Selected week workout">
              {!todaysWorkout ? (
                <div className="border-y border-stone-800 py-8">
                  <h3 className="font-semibold text-stone-100">No workouts for Week {programWeek} yet.</h3>
                  <p className="mt-2 text-sm leading-6 text-[#62675f]">
                    {selectedWeekMaxesReady && !editingMaxes
                      ? `Select Generate Week ${programWeek} to create your four training days.`
                      : 'Enter and save all four strength numbers above, then generate your week.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-stone-300">Select Training Day</h3>
                    <nav className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Generated training days">
                      {activeWeekWorkouts.map((workout, index) => {
                        const isActive = index === activeWorkoutIndex;

                        return (
                          <button
                            key={workout._id || `${workout.title}-${index}`}
                            type="button"
                            onClick={() => setActiveWorkoutIndex(index)}
                            disabled={saving || savingSet}
                            aria-current={isActive ? 'step' : undefined}
                            aria-label={`Day ${workout.programDay || index + 1}: ${getWorkoutDayLabel(workout, index)}, ${workout.status}`}
                            className={`min-h-11 min-w-0 border-l-2 px-3 py-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4f46] ${
                              isActive
                                ? 'border-[#2f4f46] bg-[#E8EDE9] text-[#203c33]'
                                : 'border-[#D2CFC7] text-[#4F534E] hover:bg-[#F4F2EC]'
                            }`}
                          >
                            <span className="font-medium">Day {workout.programDay || index + 1} — </span>
                            <span className="font-semibold">{getWorkoutDayLabel(workout, index)}</span>
                            {workout.status === 'completed' && <span className="mt-1 block text-xs text-[#62675f]">Completed</span>}
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  <div className="min-w-0 border-t border-stone-800 pt-6" aria-labelledby="today-workout-heading">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 basis-60">
                        <p className="eyebrow">Week {programWeek} · Day {todaysWorkout.programDay || activeWorkoutIndex + 1}</p>
                        <h2 id="today-workout-heading" className="mt-2 text-3xl font-semibold leading-tight text-stone-50">
                          {getWorkoutDayLabel(todaysWorkout, activeWorkoutIndex)}
                        </h2>
                        {todaysWorkout.notes && <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-[#62675f]">{todaysWorkout.notes}</p>}
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="rounded-md border border-stone-700 px-2 py-1 text-xs font-medium capitalize text-stone-400">
                          {todaysWorkout.status}
                        </span>
                        {selectedWeekReadOnly && (
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-600">View only</p>
                        )}
                        <p className="mt-3 text-sm text-[#62675f]">Est. volume {getWorkoutEstimatedVolume(todaysWorkout)} lb</p>
                        {todaysWorkout.status === 'planned' && !selectedWeekReadOnly && !saving && !savingSet && (
                          <Link to={appPaths.train} state={{ plannedWorkoutId: todaysWorkout._id }} className="btn-secondary mt-3 min-h-11">Open in Train</Link>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 space-y-6">
                      {todaysWorkout.exercises?.map((exercise, exerciseIndex) => (
                        <div key={`${exercise.exerciseName}-${exerciseIndex}`} className="border-t border-stone-800 pt-5">
                          <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h3 className="font-semibold text-stone-50">{exercise.exerciseName}</h3>
                            <p className="text-sm text-[#62675f]">
                              Uses {getLiftLabel(exercise.muscleGroup)} TM · Est. volume{' '}
                              {exercise.sets?.reduce((total, set) => total + getSetVolume(set), 0) || 0} lb
                            </p>
                          </div>

                          <div className="mt-4">
                            <table className="w-full text-left text-sm tabular-nums">
                              <caption className="sr-only">Week {programWeek}, {exercise.exerciseName} set tracking. Weights in pounds.</caption>
                              <thead className="border-b border-stone-800 text-xs uppercase text-[#62675f]">
                                <tr>
                                  <th scope="col" className="py-3 pr-2 sm:pr-4">Set</th>
                                  <th scope="col" className="py-3 pr-2 sm:pr-4">Weight</th>
                                  <th scope="col" className="py-3 pr-2 sm:pr-4">Reps</th>
                                  <th scope="col" className="py-3 pr-2">Type</th>
                                  <th scope="col" className="py-3 text-right">Done</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-800 text-stone-300">
                                {exercise.sets?.map((set, setIndex) => {
                                  const setKey = `${todaysWorkout._id || activeWorkoutIndex}-${exercise.exerciseName}-${set.setNumber}`;
                                  const isComplete = Boolean(set.completed);

                                  return (
                                    <tr key={setKey} className={isComplete ? 'bg-[#E8EDE9]/60 text-[#62675f]' : ''}>
                                      <th scope="row" className="py-2 pr-2 font-medium sm:pr-4">{set.setNumber}</th>
                                      <td className="whitespace-nowrap py-2 pr-2 font-semibold sm:pr-4">{set.weight || 0} <span className="font-normal text-[#62675f]">lb</span></td>
                                      <td className="py-2 pr-2 sm:pr-4">
                                        {set.targetReps || set.reps || 0}
                                        {set.isPlusSet ? '+' : ''}
                                      </td>
                                      <td className="py-2 pr-2">
                                        {set.isPlusSet ? (
                                          <span className="whitespace-nowrap rounded border border-[#C5B888] px-1.5 py-1 text-xs font-semibold text-[#6c5b28]">
                                            Plus Set
                                          </span>
                                        ) : (
                                          <span className="text-xs text-[#62675f] sm:text-sm">Standard</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-right">
                                        <label className="inline-flex min-h-11 min-w-11 items-center justify-end gap-2">
                                          <span className="sr-only">{isComplete ? 'Complete' : 'Open'}</span>
                                          <input
                                            type="checkbox"
                                            checked={isComplete}
                                            onChange={() => toggleSetCompletion(exerciseIndex, setIndex)}
                                            disabled={savingSet || saving || selectedWeekReadOnly || selectedWeekLocked}
                                            aria-label={`Mark ${exercise.exerciseName} set ${set.setNumber} complete`}
                                            className="h-5 w-5 rounded accent-[#2f4f46]"
                                          />
                                        </label>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={updateProgression} className="mt-8 border-t border-stone-800 pt-6" aria-labelledby="progression-heading">
                      <h3 id="progression-heading" className="section-title">Apply Progression</h3>
                      <p className="mt-2 text-sm leading-6 text-[#62675f]">
                        {selectedWeekCanProgress
                          ? `After your plus set, enter the reps completed for ${getLiftLabel(activeLiftName)}.`
                          : 'This week is view only. Select your current week to record a plus-set result.'}
                      </p>
                      <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
                        <dl>
                          <dt className="text-sm text-[#62675f]">Current TM</dt>
                          <dd className="mt-1 text-2xl font-semibold tabular-nums text-stone-50">{selectedTrainingMax?.trainingMax ?? 0} lb</dd>
                          <dd className="mt-1 text-sm text-[#62675f]">{getLiftLabel(activeLiftName)}</dd>
                        </dl>
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                          <label className="block">
                            <span className="text-sm font-medium text-stone-300">Plus-set reps</span>
                            <input
                              type="number"
                              name="plusSetReps"
                              min="0"
                              value={progressionForm.plusSetReps}
                              onChange={handleProgressionChange}
                              disabled={saving || !selectedWeekCanProgress}
                              required
                              className="form-field"
                            />
                          </label>
                          <label className="block">
                            <span className="text-sm font-medium text-stone-300">Training note</span>
                            <input
                              type="text"
                              name="notes"
                              value={progressionForm.notes}
                              onChange={handleProgressionChange}
                              disabled={saving || !selectedWeekCanProgress}
                              className="form-field"
                              placeholder="Optional note"
                            />
                          </label>
                          <button type="submit" disabled={saving || savingSet || !selectedWeekCanProgress} className="btn-primary min-h-11 sm:col-span-2 sm:w-fit">
                            {saving && operation === 'progression' ? 'Applying...' : 'Apply Progression'}
                          </button>
                        </div>
                      </div>

                      {visibleProgressionResult && (
                        <div role="status" className="mt-6 border-l-2 border-[#2f4f46] pl-4">
                          <p className="text-sm font-medium text-stone-200">Progression applied for {getLiftLabel(activeLiftName)}</p>
                          <p className="mt-1 text-sm text-[#62675f]">{visibleProgressionResult.plusSetReps} reps recorded · Previous TM {visibleProgressionResult.oldTrainingMax} lb</p>
                          <dl className="mt-4 grid max-w-md grid-cols-2 gap-4 tabular-nums">
                            <div>
                              <dt className="text-sm text-[#62675f]">Next TM</dt>
                              <dd className="mt-1 text-2xl font-semibold text-stone-50">{visibleProgressionResult.newTrainingMax} lb</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-[#62675f]">Increase</dt>
                              <dd className="mt-1 text-2xl font-semibold text-stone-50">{visibleProgressionResult.increaseAmount > 0 ? '+' : ''}{visibleProgressionResult.increaseAmount} lb</dd>
                            </div>
                          </dl>
                          {visibleProgressionResult.recommendation?.message && (
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#62675f]">{visibleProgressionResult.recommendation.message}</p>
                          )}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}
            </section>
          </section>

          <section className="min-w-0 border-t border-stone-800 pt-6" aria-labelledby="history-heading">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f4f46]"
              onClick={() => setHistoryOpen((current) => !current)}
              aria-expanded={historyOpen}
              aria-controls="program-history-panel"
            >
              <span id="history-heading" className="section-title">Program History</span>
              <span className="text-sm font-semibold text-[#62675f]">{historyOpen ? 'Hide' : 'Show'}</span>
            </button>
            {historyOpen && (historyItems.length === 0 ? (
              <p id="program-history-panel" className="empty-state mt-4">Weekly max history will appear after you generate your first week.</p>
            ) : (
              <div id="program-history-panel" role="region" aria-label="Weekly max history, scroll to view all columns" tabIndex="0" className="mt-4 overflow-x-auto border border-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2f4f46]">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <caption className="sr-only">One saved max entry per program week. All weights in pounds.</caption>
                  <thead className="border-b border-stone-800 text-xs uppercase tracking-[0.16em] text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Week</th>
                      <th className="px-4 py-3">Squat 1RM</th>
                      <th className="px-4 py-3">Bench 1RM</th>
                      <th className="px-4 py-3">Deadlift 1RM</th>
                      <th className="px-4 py-3">OHP 1RM</th>
                      <th className="px-4 py-3">Squat TM</th>
                      <th className="px-4 py-3">Bench TM</th>
                      <th className="px-4 py-3">Deadlift TM</th>
                      <th className="px-4 py-3">OHP TM</th>
                      <th className="px-4 py-3">Date Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-300">
                    {historyItems.map((item) => (
                      <tr key={item._id || item.week}>
                        <td className="px-4 py-3">Week {item.week || '-'}</td>
                        <td className="px-4 py-3">{item.maxes?.squat?.oneRepMax || 0} lb</td>
                        <td className="px-4 py-3">{item.maxes?.bench?.oneRepMax || 0} lb</td>
                        <td className="px-4 py-3">{item.maxes?.deadlift?.oneRepMax || 0} lb</td>
                        <td className="px-4 py-3">{item.maxes?.overhead_press?.oneRepMax || 0} lb</td>
                        <td className="px-4 py-3">{item.maxes?.squat?.trainingMax || 0} lb</td>
                        <td className="px-4 py-3">{item.maxes?.bench?.trainingMax || 0} lb</td>
                        <td className="px-4 py-3">{item.maxes?.deadlift?.trainingMax || 0} lb</td>
                        <td className="px-4 py-3">{item.maxes?.overhead_press?.trainingMax || 0} lb</td>
                        <td className="px-4 py-3">{formatDate(item.dateCreated || item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        </>
      )}
    </section>
  );
}

export default StrengthProgram;
