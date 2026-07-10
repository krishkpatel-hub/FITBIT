import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { trainingMaxService } from '../../services/trainingMaxService.js';
import { workoutService } from '../../services/workoutService.js';

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
const getWorkoutTitle = (workout) => {
  if (!workout) return '';

  const week = workout.programWeek || workout.title?.match(/Week\s+(\d+)/i)?.[1] || '';
  const dayLabel = getWorkoutDayLabel(workout, 0);

  return week ? `Week ${week} — ${dayLabel}` : dayLabel;
};
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
  const [trainingMaxes, setTrainingMaxes] = useState([]);
  const [programWeeks, setProgramWeeks] = useState([]);
  const [oneRepMaxes, setOneRepMaxes] = useState(emptyOneRepMaxes);
  const [programWeek, setProgramWeek] = useState('1');
  const [generatedWorkouts, setGeneratedWorkouts] = useState([]);
  const [activeWorkoutIndex, setActiveWorkoutIndex] = useState(0);
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

  const selectedTrainingMax = useMemo(
    () =>
      trainingMaxes.find((trainingMax) => trainingMax._id === progressionForm.trainingMaxId) ||
      trainingMaxByLift[activeLiftName] ||
      trainingMaxes[0],
    [activeLiftName, progressionForm.trainingMaxId, trainingMaxByLift, trainingMaxes],
  );

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
    label: week === 4 ? 'Week 4 Deload' : `Week ${week}`,
    status: isProgramWeekComplete(programWeeks.find((entry) => Number(entry.week) === week))
      ? 'Completed'
      : week === activeProgramWeekNumber
        ? 'Current'
        : `Locked until Week ${week - 1} complete`,
    locked: week > activeProgramWeekNumber,
  }));

  const selectedLiftHistory = selectedTrainingMax?.history || [];
  const latestSelectedHistory = selectedLiftHistory[selectedLiftHistory.length - 1];

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
      const [response, programWeeksResponse] = await Promise.all([
        trainingMaxService.getTrainingMaxes(),
        trainingMaxService.getProgramWeeks(),
      ]);
      const loadedTrainingMaxes = response.data || [];
      const loadedProgramWeeks = programWeeksResponse.data || [];
      const activeWeek = getActiveProgramWeekNumber(loadedProgramWeeks);
      const nextSelectedWeek = Number(programWeek) > activeWeek ? activeWeek : Number(programWeek);
      const selectedWeekEntry = loadedProgramWeeks.find((weekEntry) => Number(weekEntry.week) === nextSelectedWeek);
      const maxesReadyForSelectedWeek = loadedTrainingMaxes.length === lifts.length &&
        loadedTrainingMaxes.every((trainingMax) => Number(trainingMax.currentWeek || 1) === nextSelectedWeek);

      if (nextSelectedWeek !== Number(programWeek)) {
        setProgramWeek(String(nextSelectedWeek));
      }
      setTrainingMaxes(loadedTrainingMaxes);
      setProgramWeeks(loadedProgramWeeks);
      setGeneratedWorkouts(selectedWeekEntry?.workouts || []);
      setActiveWorkoutIndex(0);
      setOneRepMaxes(
        lifts.reduce((values, lift) => {
          const existing = loadedTrainingMaxes.find((trainingMax) => trainingMax.liftName === lift.key);
          values[lift.key] = maxesReadyForSelectedWeek || nextSelectedWeek === 1 ? existing?.oneRepMax ?? '' : '';
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

  useEffect(() => {
    setActiveWorkoutIndex(0);
  }, [programWeek]);

  useEffect(() => {
    if (trainingMaxes.length === 0) {
      return;
    }

    const maxesReadyForSelectedWeek = trainingMaxes.length === lifts.length &&
      trainingMaxes.every((trainingMax) => Number(trainingMax.currentWeek || 1) === Number(programWeek));

    setOneRepMaxes(
      lifts.reduce((values, lift) => {
        const existing = trainingMaxes.find((trainingMax) => trainingMax.liftName === lift.key);
        values[lift.key] = maxesReadyForSelectedWeek || Number(programWeek) === 1 ? existing?.oneRepMax ?? '' : '';
        return values;
      }, {}),
    );
  }, [programWeek, trainingMaxes]);

  useEffect(() => {
    if (!activeLiftName || !trainingMaxByLift[activeLiftName]) {
      return;
    }

    setProgressionForm((current) => ({
      ...current,
      trainingMaxId: trainingMaxByLift[activeLiftName]._id,
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

    try {
      const response = await trainingMaxService.generateProgram({ week: Number(programWeek) });
      const createdProgramWeek = response.data?.programWeek;
      setProgramWeeks((current) => {
        const withoutWeek = current.filter((weekEntry) => Number(weekEntry.week) !== Number(programWeek));
        return [...withoutWeek, createdProgramWeek].filter(Boolean).sort((a, b) => Number(a.week) - Number(b.week));
      });
      setGeneratedWorkouts(createdProgramWeek?.workouts || response.data?.workouts || []);
      setActiveWorkoutIndex(0);
      setSuccess(`Generated 4 workouts for Week ${programWeek}.`);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to generate program.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSetCompletion = async (exerciseIndex, setIndex) => {
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

    try {
      const response = await workoutService.updateWorkout(activeWorkout._id, {
        exercises: nextExercises,
        status: allSetsComplete ? 'completed' : 'planned',
      });
      const updatedWorkout = response.data;

      setGeneratedWorkouts((current) =>
        current.map((workout) => (workout._id === updatedWorkout._id ? updatedWorkout : workout)),
      );
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

    if (selectedWeekReadOnly || selectedWeekLocked) {
      setError('Completed or locked weeks are view-only.');
      return;
    }

    const activeTrainingMaxId = activeLiftName ? trainingMaxByLift[activeLiftName]?._id : progressionForm.trainingMaxId;

    if (!activeTrainingMaxId) {
      setError('Select a lift before applying progression.');
      return;
    }

    if (progressionForm.plusSetReps === '' || Number(progressionForm.plusSetReps) < 0) {
      setError('Enter plus-set reps as 0 or greater.');
      return;
    }

    const selectedTrainingMax = trainingMaxes.find((trainingMax) => trainingMax._id === activeTrainingMaxId);
    setSaving(true);

    try {
      const response = await trainingMaxService.updateProgression({
        trainingMaxId: activeTrainingMaxId,
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
    <motion.section
      className="page-stack"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <header className="border-b border-stone-800 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Current Block</p>
            <h1 className="page-title">Strength Program</h1>
            <p className="page-copy">
              Week {currentWeek} of 4 · Last updated {formatDate(latestUpdatedAt)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 text-right text-sm sm:grid-cols-3">
            <div>
              <p className="text-stone-500">Block</p>
              <p className="mt-1 font-medium text-stone-100">Adaptive 5/3/1</p>
            </div>
            <div>
              <p className="text-stone-500">Generated</p>
              <p className="mt-1 font-medium text-stone-100">{activeWeekWorkouts.length} workouts</p>
            </div>
            <Link to="/calendar" className="btn-secondary col-span-2 self-start sm:col-span-1">
              View Calendar
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <motion.p role="alert" className="status-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {error}
        </motion.p>
      )}
      {success && (
        <motion.p role="status" className="status-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {success}
        </motion.p>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4" aria-label="Loading strength program">
          {lifts.map((lift) => (
            <div key={lift.key} className="h-36 animate-pulse rounded-lg border border-stone-800 bg-stone-900/40" />
          ))}
        </div>
      ) : (
        <>
          <section aria-labelledby="training-max-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="training-max-heading" className="section-title">
                  Current Training Maxes
                </h2>
                <p className="section-copy">Compact view of the numbers driving this block.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {lifts.map((lift) => {
                const trainingMax = trainingMaxByLift[lift.key];
                const history = trainingMax?.history || [];
                const latestHistory = history[history.length - 1];
                const progressAmount = latestHistory?.increaseAmount ?? 0;

                return (
                  <motion.article
                    key={lift.key}
                    className="border-t border-stone-800 pt-4"
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-base font-semibold text-stone-50">{lift.label}</h3>
                      <span className="text-xs text-stone-500">W{trainingMax?.currentWeek || 1}</span>
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-stone-50">
                      {trainingMax?.trainingMax || 0}
                      <span className="ml-1 text-sm font-normal text-stone-500">lb TM</span>
                    </p>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-stone-500">1RM</dt>
                        <dd className="text-stone-200">{trainingMax?.oneRepMax || 0} lb</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-stone-500">Progress</dt>
                        <dd className="text-stone-200">
                          {progressAmount > 0 ? '+' : ''}
                          {progressAmount} lb
                        </dd>
                      </div>
                    </dl>
                  </motion.article>
                );
              })}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="program-overview-heading">
            <div>
              <h2 id="program-overview-heading" className="section-title">
                Program Overview
              </h2>
              <p className="section-copy">Choose the week to generate, then use today’s session as the working plan.</p>
              {selectedWeekComplete && Number(programWeek) < 4 && (
                <p className="status-success mt-4">
                  Week complete. Enter updated maxes to generate Week {Number(programWeek) + 1}.
                </p>
              )}
              {selectedWeekLocked && (
                <p className="empty-state mt-4">Complete Week {activeProgramWeekNumber} to unlock Week {programWeek}.</p>
              )}
              {selectedWeekCanGenerate && !selectedWeekGenerated && Number(programWeek) > 1 && (
                <p className="empty-state mt-4">Enter fresh maxes to generate Week {programWeek}.</p>
              )}

              <div className="mt-6 space-y-3">
                {programWeekOptions.map((week) => (
                  <button
                    key={week.week}
                    type="button"
                    onClick={() => {
                      if (!week.locked) {
                        setProgramWeek(String(week.week));
                      }
                    }}
                    disabled={week.locked}
                    aria-disabled={week.locked}
                    className={`flex w-full items-center justify-between border-l px-4 py-3 text-left transition-colors ${
                      week.locked
                        ? 'cursor-not-allowed border-stone-900 text-stone-700'
                        : week.status === 'Current'
                        ? 'border-stone-100 bg-stone-900/50 text-stone-50'
                        : 'border-stone-800 text-stone-400 hover:border-stone-600 hover:bg-stone-900/30'
                    }`}
                  >
                    <span className="font-medium">{week.label}</span>
                    <span className="text-xs uppercase tracking-[0.18em]">{week.status}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={generateProgram}
                  disabled={saving || trainingMaxes.length === 0 || !selectedWeekCanGenerate}
                  className="btn-primary"
                >
                  {saving ? 'Generating...' : selectedWeekGenerated ? `Regenerate Week ${programWeek}` : `Generate Week ${programWeek}`}
                </button>
                <Link to="/calendar" className="btn-secondary">
                  Training Calendar
                </Link>
              </div>
            </div>

            <section className="quiet-card" aria-labelledby="today-workout-heading">
              {!todaysWorkout ? (
                <p className="empty-state mt-6">Generate your weekly program to load today’s training plan.</p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
                  <nav className="space-y-2" aria-label="Generated training days">
                    <p className="eyebrow">Training Days</p>
                    {activeWeekWorkouts.map((workout, index) => {
                      const isActive = index === activeWorkoutIndex;

                      return (
                        <button
                          key={workout._id || `${workout.title}-${index}`}
                          type="button"
                          onClick={() => setActiveWorkoutIndex(index)}
                          className={`w-full border-l px-3 py-3 text-left transition-colors ${
                            isActive
                              ? 'border-stone-100 bg-stone-900/50 text-stone-50'
                              : 'border-stone-800 text-stone-400 hover:border-stone-600 hover:bg-stone-900/30'
                          }`}
                        >
                          <span className="block text-sm font-semibold">Day {workout.programDay || index + 1}</span>
                          <span className="mt-1 block text-xs uppercase tracking-[0.14em]">
                            {getWorkoutDayLabel(workout, index)}
                          </span>
                        </button>
                      );
                    })}
                  </nav>

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow">Today’s Workout</p>
                        <h2 id="today-workout-heading" className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
                          {getWorkoutTitle(todaysWorkout)}
                        </h2>
                        {todaysWorkout.notes && <p className="mt-2 text-sm leading-6 text-stone-400">{todaysWorkout.notes}</p>}
                      </div>
                      <div className="text-right">
                      <span className="rounded-md border border-stone-700 px-2 py-1 text-xs font-medium capitalize text-stone-400">
                          {todaysWorkout.status}
                        </span>
                        {selectedWeekReadOnly && (
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-600">View only</p>
                        )}
                        <p className="mt-3 text-sm text-stone-500">Est. volume {getWorkoutEstimatedVolume(todaysWorkout)} lb</p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-6">
                      {todaysWorkout.exercises?.map((exercise, exerciseIndex) => (
                        <div key={`${exercise.exerciseName}-${exerciseIndex}`} className="border-t border-stone-800 pt-5">
                          <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h3 className="font-semibold text-stone-50">{exercise.exerciseName}</h3>
                            <p className="text-sm text-stone-500">
                              Uses {getLiftLabel(exercise.muscleGroup)} TM · Est. volume{' '}
                              {exercise.sets?.reduce((total, set) => total + getSetVolume(set), 0) || 0} lb
                            </p>
                          </div>

                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                              <thead className="border-b border-stone-800 text-xs uppercase tracking-[0.16em] text-stone-500">
                                <tr>
                                  <th className="py-2 pr-4">Done</th>
                                  <th className="py-2 pr-4">Set</th>
                                  <th className="py-2 pr-4">Target Weight</th>
                                  <th className="py-2 pr-4">Target Reps</th>
                                  <th className="py-2 pr-4">Plus Set</th>
                                  <th className="py-2 pr-4 text-right">Estimated Volume</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-800 text-stone-300">
                                {exercise.sets?.map((set, setIndex) => {
                                  const setKey = `${todaysWorkout._id || activeWorkoutIndex}-${exercise.exerciseName}-${set.setNumber}`;
                                  const isComplete = Boolean(set.completed);

                                  return (
                                    <tr key={setKey} className={isComplete ? 'text-stone-500' : ''}>
                                      <td className="py-3 pr-4">
                                        <input
                                          type="checkbox"
                                          checked={isComplete}
                                          onChange={() => toggleSetCompletion(exerciseIndex, setIndex)}
                                          disabled={selectedWeekReadOnly || selectedWeekLocked}
                                          aria-label={`Mark ${exercise.exerciseName} set ${set.setNumber} complete`}
                                          className="h-4 w-4 rounded border-stone-700 bg-stone-950 accent-stone-200"
                                        />
                                      </td>
                                      <td className="py-3 pr-4">{set.setNumber}</td>
                                      <td className="py-3 pr-4">{set.weight || 0} lb</td>
                                      <td className="py-3 pr-4">{set.targetReps || set.reps || 0}</td>
                                      <td className="py-3 pr-4">
                                        {set.isPlusSet ? (
                                          <span className="rounded-md border border-amber-300/40 px-2 py-1 text-xs font-semibold text-amber-200">
                                            {set.targetReps || set.reps || 0}+
                                          </span>
                                        ) : (
                                          <span className="text-stone-600">No</span>
                                        )}
                                      </td>
                                      <td className="py-3 pr-4 text-right">{getSetVolume(set)} lb</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </section>

          <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]" aria-labelledby="progression-heading">
            <form onSubmit={updateProgression} className="quiet-card">
              <p className="eyebrow">Progression</p>
              <h2 id="progression-heading" className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
                Apply plus-set result
              </h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Lift</span>
                  <select
                    name="trainingMaxId"
                    value={progressionForm.trainingMaxId}
                    onChange={handleProgressionChange}
                    disabled={selectedWeekReadOnly || selectedWeekLocked}
                    required
                    className="form-field"
                  >
                    <option value="">Select lift</option>
                    {trainingMaxes.map((trainingMax) => (
                      <option key={trainingMax._id} value={trainingMax._id}>
                        {getLiftLabel(trainingMax.liftName)}
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
                    disabled={selectedWeekReadOnly || selectedWeekLocked}
                    required
                    className="form-field"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-stone-300">Training note</span>
                  <input
                    type="text"
                    name="notes"
                    value={progressionForm.notes}
                    onChange={handleProgressionChange}
                    disabled={selectedWeekReadOnly || selectedWeekLocked}
                    className="form-field"
                    placeholder="Optional note"
                  />
                </label>
              </div>

              <button type="submit" disabled={saving || trainingMaxes.length === 0 || selectedWeekReadOnly || selectedWeekLocked} className="btn-accent mt-6">
                {saving ? 'Applying...' : 'Apply Progression'}
              </button>
            </form>

            <div className="border-y border-stone-800 py-6">
              <h3 className="section-title">{getLiftLabel(selectedTrainingMax?.liftName || 'bench')}</h3>
              <dl className="mt-5 grid gap-5 sm:grid-cols-4">
                <div>
                  <dt className="text-sm text-stone-500">Current TM</dt>
                  <dd className="mt-1 text-2xl font-semibold text-stone-50">{selectedTrainingMax?.trainingMax || 0}</dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Plus Set</dt>
                  <dd className="mt-1 text-2xl font-semibold text-stone-50">
                    {(progressionResult?.plusSetReps ?? progressionForm.plusSetReps) || 0} reps
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Next TM</dt>
                  <dd className="mt-1 text-2xl font-semibold text-stone-50">
                    {progressionResult?.newTrainingMax || selectedTrainingMax?.trainingMax || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Increase</dt>
                  <dd className="mt-1 text-2xl font-semibold text-stone-50">
                    {progressionResult?.increaseAmount ? `+${progressionResult.increaseAmount}` : latestSelectedHistory?.increaseAmount || 0} lb
                  </dd>
                </div>
              </dl>

              <div className="mt-6 rounded-md border border-stone-800 bg-stone-950/50 p-4">
                <p className="text-sm font-medium text-stone-200">Recommendation</p>
                <p className="mt-2 text-sm leading-6 text-stone-400">
                  {progressionResult?.recommendation?.message ||
                    'Enter the completed plus-set reps and apply progression to generate the next training max recommendation.'}
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-stone-800 pt-8" aria-labelledby="setup-heading">
            {selectedWeekCanGenerate ? (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="setup-heading" className="section-title">
                    {selectedWeekGenerated ? `Adjust Week ${programWeek} Maxes` : `Enter Week ${programWeek} Maxes`}
                  </h2>
                  <p className="section-copy">Training max is previewed at 90%. Save all four maxes before generating this week.</p>
                </div>
              </div>
            ) : (
              <div>
                <h2 id="setup-heading" className="section-title">Weekly Max Entry</h2>
                <p className="empty-state mt-4">
                  {selectedWeekLocked
                    ? `Complete Week ${activeProgramWeekNumber} to unlock Week ${programWeek}.`
                    : 'Completed weeks are view-only.'}
                </p>
              </div>
            )}

            {selectedWeekCanGenerate && (
            <form onSubmit={saveOneRepMaxes} className="mt-6">
              <div className="grid gap-4 md:grid-cols-4">
                {lifts.map((lift) => {
                  const oneRepMax = oneRepMaxes[lift.key];
                  const previewTrainingMax = calculateTrainingMax(oneRepMax);

                  return (
                    <label key={lift.key} className="block">
                      <span className="text-sm font-medium text-stone-300">{lift.label} 1RM</span>
                      <input
                        type="number"
                        min="0"
                        value={oneRepMax}
                        onChange={(event) => handleOneRepMaxChange(lift.key, event.target.value)}
                        className="form-field"
                      />
                      <span className="mt-1 block text-xs text-stone-500">TM preview: {previewTrainingMax}</span>
                    </label>
                  );
                })}
              </div>

              <button type="submit" disabled={saving} className="btn-secondary mt-6">
                {saving ? 'Saving...' : 'Save Training Maxes'}
              </button>
            </form>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="history-heading">
            <h2 id="history-heading" className="section-title">
              Program History
            </h2>
            {historyItems.length === 0 ? (
              <p className="empty-state">Weekly max history will appear after you generate your first week.</p>
            ) : (
              <div className="overflow-x-auto border border-stone-800">
                <table className="w-full min-w-[1040px] text-left text-sm">
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
            )}
          </section>
        </>
      )}
    </motion.section>
  );
}

export default StrengthProgram;
