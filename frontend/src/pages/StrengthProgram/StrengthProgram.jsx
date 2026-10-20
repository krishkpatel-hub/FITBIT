import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { trainingMaxService } from '../../services/trainingMaxService';
import { workoutService } from '../../services/workoutService';
import { getUserFacingError } from '../../utils/apiError';
import { appPaths } from '../../utils/navigation';
import {
  canApplyProgression,
  getActiveProgramWeekNumber,
  getCompletedSetCount,
  getNextWorkoutIndex,
  getProgramStage,
  getWeekViewStatus,
  isProgramWeekComplete,
} from '../../utils/programWorkspace';

const lifts = [
  { key: 'squat', label: 'Squat' },
  { key: 'bench', label: 'Bench Press' },
  { key: 'deadlift', label: 'Deadlift' },
  { key: 'overhead_press', label: 'Overhead Press' },
];
const emptyOneRepMaxes = Object.fromEntries(lifts.map((lift) => [lift.key, '']));
const roundToNearestFive = (value) => Math.round(Number(value || 0) / 5) * 5;
const calculateTrainingMax = (oneRepMax) => roundToNearestFive(Number(oneRepMax || 0) * 0.9);
const hasPositiveNumber = (value) => value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
const getLiftLabel = (liftName) => lifts.find((lift) => lift.key === liftName)?.label || liftName;
const getWorkoutLiftName = (workout) => workout?.liftName || workout?.exercises?.[0]?.muscleGroup || '';
const getWorkoutDayLabel = (workout, index) => getLiftLabel(getWorkoutLiftName(workout)) || workout?.title?.split(' - ')[1] || `Day ${index + 1}`;
const getSetVolume = (set) => Number(set.weight || 0) * Number(set.targetReps || set.reps || 0);
const getWorkoutEstimatedVolume = (workout) => workout?.exercises?.reduce((total, exercise) =>
  total + (exercise.sets?.reduce((setTotal, set) => setTotal + getSetVolume(set), 0) || 0), 0) || 0;
const formatDate = (date) => {
  if (!date) return 'Not recorded';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(parsed);
};

function StrengthProgram() {
  const { logout } = useAuth();
  const realtime = useRealtime();
  const location = useLocation();
  const navigationWeek = Number(location.state?.generatedWeek || 1);
  const initialWeek = navigationWeek >= 1 && navigationWeek <= 4 ? navigationWeek : 1;
  const [trainingMaxes, setTrainingMaxes] = useState([]);
  const [programWeeks, setProgramWeeks] = useState([]);
  const [oneRepMaxes, setOneRepMaxes] = useState(emptyOneRepMaxes);
  const [programWeek, setProgramWeek] = useState(String(initialWeek));
  const [activeWorkoutIndex, setActiveWorkoutIndex] = useState(0);
  const [progressionForm, setProgressionForm] = useState({ trainingMaxId: '', plusSetReps: '', notes: '' });
  const [progressionResult, setProgressionResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [operation, setOperation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingMaxes, setEditingMaxes] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const setRequestRef = useRef(false);
  const generationRequestRef = useRef(false);
  const progressionRequestRef = useRef(false);
  const firstLoadRef = useRef(true);
  const editingMaxesRef = useRef(false);
  const selectionRef = useRef({ week: String(initialWeek), workoutId: null });
  const loadRef = useRef(null);
  editingMaxesRef.current = editingMaxes;

  const trainingMaxByLift = useMemo(() => Object.fromEntries(trainingMaxes.map((max) => [max.liftName, max])), [trainingMaxes]);
  const activeWeekNumber = useMemo(() => getActiveProgramWeekNumber(programWeeks), [programWeeks]);
  const selectedProgramWeek = useMemo(() => programWeeks.find((week) => Number(week.week) === Number(programWeek)), [programWeeks, programWeek]);
  const selectedWeekStatus = getWeekViewStatus(Number(programWeek), activeWeekNumber, programWeeks);
  const selectedWeekLocked = selectedWeekStatus === 'locked';
  const selectedWeekReadOnly = selectedWeekStatus === 'completed';
  const canEditWeek = !selectedWeekLocked && !selectedWeekReadOnly;
  const selectedWeekGenerated = Boolean(selectedProgramWeek?.workouts?.length);
  const selectedWeekMaxesReady = lifts.every((lift) => Number(trainingMaxByLift[lift.key]?.currentWeek || 0) === Number(programWeek));
  const weekWorkouts = selectedProgramWeek?.workouts?.length ? selectedProgramWeek.workouts : [];
  const activeWorkout = weekWorkouts[activeWorkoutIndex] || weekWorkouts[0];
  const activeLiftName = getWorkoutLiftName(activeWorkout);
  const currentTrainingMax = trainingMaxByLift[activeLiftName];
  const stage = getProgramStage(trainingMaxes, selectedProgramWeek, Number(programWeek));
  const completedDays = weekWorkouts.filter((workout) => workout.status === 'completed').length;
  const setProgress = getCompletedSetCount(activeWorkout);
  const nextWorkoutIndex = getNextWorkoutIndex(weekWorkouts);
  const hasNextWorkout = weekWorkouts[nextWorkoutIndex]?.status !== 'completed';
  const hasPlusSet = activeWorkout?.exercises?.some((exercise) => exercise.sets?.some((set) => set.isPlusSet));
  // A completed fourth workout must not lock its plus-set result before fresh maxes are entered.
  const canProgress = canApplyProgression({
    week: Number(programWeek), activeWeek: activeWeekNumber, generated: selectedWeekGenerated,
    hasPlusSet: Boolean(hasPlusSet), trainingMaxWeek: Number(currentTrainingMax?.currentWeek || 0),
  });
  const visibleProgressionResult = progressionResult?.liftName === activeLiftName && progressionResult?.week === Number(programWeek)
    ? progressionResult : null;
  const latestUpdatedAt = trainingMaxes.map((max) => max.lastUpdated || max.updatedAt || max.createdAt)
    .filter(Boolean).map((date) => new Date(date).getTime()).filter(Number.isFinite);
  const lastUpdated = latestUpdatedAt.length ? new Date(Math.max(...latestUpdatedAt)) : null;

  const syncOneRepMaxesForWeek = (loadedMaxes, week) => {
    const maxesReady = lifts.every((lift) => Number(loadedMaxes.find((max) => max.liftName === lift.key)?.currentWeek || 0) === Number(week));
    return Object.fromEntries(lifts.map((lift) => {
      const existing = loadedMaxes.find((max) => max.liftName === lift.key);
      return [lift.key, maxesReady || Number(week) === 1 ? existing?.oneRepMax ?? '' : ''];
    }));
  };

  const handleApiError = async (err, fallback) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }
    return getUserFacingError(err, fallback);
  };

  const loadTrainingMaxes = async ({ quiet = false, resetForm = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [maxResponse, weekResponse] = await Promise.all([
        trainingMaxService.getTrainingMaxes(), trainingMaxService.getProgramWeeks(),
      ]);
      const loadedMaxes = maxResponse.data || [];
      const loadedWeeks = weekResponse.data || [];
      const active = getActiveProgramWeekNumber(loadedWeeks);
      const requested = firstLoadRef.current && !location.state?.generatedWeek ? active : Number(selectionRef.current.week);
      const selected = Math.max(1, Math.min(requested, active));
      const selectedEntry = loadedWeeks.find((week) => Number(week.week) === selected);
      const workouts = selectedEntry?.workouts || [];
      const workoutIndex = getNextWorkoutIndex(workouts, selectionRef.current.week === String(selected) ? selectionRef.current.workoutId : null);
      selectionRef.current = { week: String(selected), workoutId: workouts[workoutIndex]?._id || null };
      setTrainingMaxes(loadedMaxes);
      setProgramWeeks(loadedWeeks);
      setProgramWeek(String(selected));
      setActiveWorkoutIndex(workoutIndex);
      if (firstLoadRef.current || resetForm || !editingMaxesRef.current) {
        setOneRepMaxes(syncOneRepMaxesForWeek(loadedMaxes, selected));
      }
      if (firstLoadRef.current || resetForm) {
        const selectedStage = getProgramStage(loadedMaxes, selectedEntry, selected);
        setEditingMaxes(selectedStage === 'setup' || selectedStage === 'maxes-needed');
      }
      firstLoadRef.current = false;
      setError('');
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load your strength program.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  };
  loadRef.current = loadTrainingMaxes;

  useEffect(() => { void loadRef.current(); }, []);
  useEffect(() => {
    if (!realtime) return undefined;
    return realtime.subscribe(['workout.updated', 'workout.completed'], () => { void loadRef.current({ quiet: true }); });
  }, [realtime]);

  useEffect(() => {
    if (!activeLiftName || !currentTrainingMax?._id) return;
    setProgressionForm((current) => current.trainingMaxId === currentTrainingMax._id ? current : {
      trainingMaxId: currentTrainingMax._id, plusSetReps: '', notes: '',
    });
  }, [activeLiftName, currentTrainingMax?._id]);

  const chooseWeek = (week) => {
    if (saving || savingSet || getWeekViewStatus(week, activeWeekNumber, programWeeks) === 'locked') return;
    const entry = programWeeks.find((item) => Number(item.week) === week);
    const nextIndex = getNextWorkoutIndex(entry?.workouts || []);
    selectionRef.current = { week: String(week), workoutId: entry?.workouts?.[nextIndex]?._id || null };
    setProgramWeek(String(week));
    setActiveWorkoutIndex(nextIndex);
    setOneRepMaxes(syncOneRepMaxesForWeek(trainingMaxes, week));
    const nextStage = getProgramStage(trainingMaxes, entry, week);
    setEditingMaxes(nextStage === 'setup' || nextStage === 'maxes-needed');
    setError('');
    setSuccess('');
  };

  const chooseWorkout = (index) => {
    if (saving || savingSet) return;
    selectionRef.current = { week: programWeek, workoutId: weekWorkouts[index]?._id || null };
    setActiveWorkoutIndex(index);
    setError('');
    setSuccess('');
  };

  const saveOneRepMaxes = async (event) => {
    event.preventDefault();
    if (saving || !canEditWeek) return;
    setError('');
    setSuccess('');
    if (!lifts.every((lift) => hasPositiveNumber(oneRepMaxes[lift.key]))) {
      setError('Enter a positive 1RM for all four lifts.');
      return;
    }
    setSaving(true);
    setOperation('maxes');
    try {
      await Promise.all(lifts.map((lift) => {
        const existing = trainingMaxByLift[lift.key];
        const payload = { liftName: lift.key, oneRepMax: Number(oneRepMaxes[lift.key]), currentWeek: Number(programWeek) };
        return existing ? trainingMaxService.updateTrainingMax(existing._id, payload) : trainingMaxService.createTrainingMax(payload);
      }));
      await loadTrainingMaxes({ quiet: true, resetForm: true });
      setSuccess(`Week ${programWeek} strength numbers saved.`);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save strength numbers. Your entries are still here.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelMaxEditing = () => {
    setOneRepMaxes(syncOneRepMaxesForWeek(trainingMaxes, Number(programWeek)));
    setEditingMaxes(false);
    setError('');
  };

  const generateProgram = async () => {
    if (generationRequestRef.current || saving || !canEditWeek) return;
    if (!selectedWeekMaxesReady) {
      setError(`Save fresh strength numbers before generating Week ${programWeek}.`);
      return;
    }
    if (selectedWeekGenerated && !window.confirm(`Request Week ${programWeek} again? An existing four-day week is returned unchanged. A partial week may be replaced.`)) return;
    generationRequestRef.current = true;
    setSaving(true);
    setOperation('generate');
    setError('');
    setSuccess('');
    try {
      const response = await trainingMaxService.generateProgram({ week: Number(programWeek) });
      const generated = response.data?.programWeek;
      if (!generated) throw new Error('The server did not return a program week.');
      setProgramWeeks((current) => [...current.filter((week) => Number(week.week) !== Number(programWeek)), generated]
        .sort((a, b) => Number(a.week) - Number(b.week)));
      const nextIndex = getNextWorkoutIndex(generated.workouts || []);
      selectionRef.current = { week: programWeek, workoutId: generated.workouts?.[nextIndex]?._id || null };
      setActiveWorkoutIndex(nextIndex);
      setEditingMaxes(false);
      setSuccess(response.data?.message || `Week ${programWeek} is ready. Choose a training day to begin.`);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to generate this week.'));
    } finally {
      generationRequestRef.current = false;
      setSaving(false);
    }
  };

  const toggleSetCompletion = async (exerciseIndex, setIndex) => {
    if (setRequestRef.current || saving || !canEditWeek || !activeWorkout?._id) return;
    setRequestRef.current = true;
    setSavingSet(true);
    setError('');
    setSuccess('');
    const nextExercises = activeWorkout.exercises.map((exercise, currentExercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, currentSet) => {
        if (currentExercise !== exerciseIndex || currentSet !== setIndex) return set;
        const completed = !set.completed;
        return { ...set, completed, reps: completed && !set.reps ? set.targetReps : set.reps };
      }),
    }));
    const allSetsComplete = nextExercises.every((exercise) => exercise.sets.every((set) => set.completed));
    try {
      const response = await workoutService.updateWorkout(activeWorkout._id, {
        exercises: nextExercises, status: allSetsComplete ? 'completed' : 'planned',
      });
      const updated = response.data;
      const updatedWeek = weekWorkouts.map((workout) => workout._id === updated._id ? updated : workout);
      setProgramWeeks((current) => current.map((week) => Number(week.week) === Number(programWeek) ? {
        ...week,
        workouts: updatedWeek,
        status: isProgramWeekComplete({ ...week, workouts: updatedWeek }) ? 'completed' : 'current',
      } : week));
      if (allSetsComplete) {
        setSuccess(isProgramWeekComplete({ workouts: updatedWeek }) && Number(programWeek) < 4
          ? `Week ${programWeek} complete. Enter new maxes to generate Week ${Number(programWeek) + 1}.`
          : 'Workout completed.');
      }
    } catch (err) {
      setError(await handleApiError(err, 'Could not save this set. Your previous result is unchanged. Try again.'));
    } finally {
      setRequestRef.current = false;
      setSavingSet(false);
    }
  };

  const updateProgression = async (event) => {
    event.preventDefault();
    if (progressionRequestRef.current || saving) return;
    setError('');
    setSuccess('');
    if (!canProgress || !currentTrainingMax?._id) {
      setError('A plus set for the current week is required to apply progression.');
      return;
    }
    if (progressionForm.plusSetReps === '' || !Number.isInteger(Number(progressionForm.plusSetReps)) || Number(progressionForm.plusSetReps) < 0) {
      setError('Enter plus-set reps as a whole number, 0 or greater.');
      return;
    }
    progressionRequestRef.current = true;
    setSaving(true);
    setOperation('progression');
    try {
      const response = await trainingMaxService.updateProgression({
        trainingMaxId: currentTrainingMax._id,
        plusSetReps: Number(progressionForm.plusSetReps),
        notes: progressionForm.notes,
      });
      setProgressionResult({
        liftName: activeLiftName,
        week: Number(programWeek),
        oldTrainingMax: currentTrainingMax.trainingMax,
        plusSetReps: Number(progressionForm.plusSetReps),
        increaseAmount: response.data.increaseAmount,
        newTrainingMax: response.data.trainingMax.trainingMax,
        recommendation: response.data.recommendation,
      });
      setProgressionForm((current) => ({ ...current, plusSetReps: '', notes: '' }));
      await loadTrainingMaxes({ quiet: true });
      setSuccess('Progression applied. Your updated training max is shown below.');
    } catch (err) {
      setError(await handleApiError(err, 'Unable to apply progression. Your reps are still entered.'));
    } finally {
      progressionRequestRef.current = false;
      setSaving(false);
    }
  };

  const showEditor = editingMaxes || stage === 'setup' || stage === 'maxes-needed';
  const snapshot = selectedWeekReadOnly ? selectedProgramWeek?.maxes : null;
  const historyItems = [...programWeeks].sort((a, b) => Number(a.week) - Number(b.week));

  return (
    <section className="page-stack min-w-0">
      <header className="page-header flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Adaptive 5/3/1</p>
          <h1 className="page-title">Strength Program</h1>
          {!loading && <p className="page-copy">Week {programWeek} of 4 · {completedDays} of {weekWorkouts.length || 4} sessions complete{lastUpdated ? ` · Updated ${formatDate(lastUpdated)}` : ''}</p>}
        </div>
        <Link to={appPaths.calendar} className="btn-secondary">Calendar</Link>
      </header>

      {error && <p role="alert" className="status-error">{error}</p>}
      {success && <p role="status" className="status-success">{success}</p>}

      {loading ? (
        <div role="status" aria-label="Loading strength program" className="space-y-4">
          <div className="skeleton-panel h-24" />
          <div className="skeleton-panel h-56" />
        </div>
      ) : (
        <>
          {stage === 'setup' && <div className="border-b border-[#D2CFC7] pb-5"><h2 className="section-title">Set up your strength program</h2><p className="section-copy">Enter your current one-rep max for each lift.</p></div>}
          {stage === 'ready' && !showEditor && <div className="border-b border-[#D2CFC7] pb-5"><h2 className="section-title">Ready for Week {programWeek}</h2><p className="section-copy">Your four strength numbers are saved.</p></div>}
          {stage === 'maxes-needed' && <div className="border-b border-[#D2CFC7] pb-5"><h2 className="section-title">Start Week {programWeek}</h2><p className="section-copy">Enter updated one-rep maxes before generating this week.</p></div>}

          <section aria-labelledby="strength-numbers-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="strength-numbers-heading" className="section-title">Strength numbers</h2>
                <p className="section-copy">{snapshot ? `Saved Week ${programWeek} snapshot` : `Current values for Week ${programWeek}`} · lb</p>
              </div>
              {!showEditor && canEditWeek && (
                <button type="button" className="btn-secondary" disabled={saving || savingSet} onClick={() => { setOneRepMaxes(syncOneRepMaxesForWeek(trainingMaxes, Number(programWeek))); setEditingMaxes(true); }}>
                  Edit strength numbers
                </button>
              )}
            </div>
            <form onSubmit={saveOneRepMaxes} className="border-y border-[#D2CFC7]" aria-label="Strength numbers">
              <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
                {lifts.map((lift) => {
                  const saved = snapshot?.[lift.key] || trainingMaxByLift[lift.key];
                  return (
                    <div key={lift.key} className="border-t border-[#D2CFC7] py-4 first:border-t-0 sm:[&:nth-child(2)]:border-t-0 lg:border-t-0">
                      <h3 className="font-semibold text-[#151714]">{lift.label}</h3>
                      {showEditor && canEditWeek ? (
                        <label className="mt-3 block text-sm font-medium text-[#4F534E]">
                          1RM (lb)
                          <input type="number" min="1" step="any" required disabled={saving} value={oneRepMaxes[lift.key]} onChange={(event) => setOneRepMaxes((current) => ({ ...current, [lift.key]: event.target.value }))} className="form-field" aria-label={`${lift.label} 1RM in pounds`} />
                          <span className="mt-2 block font-normal text-[#747872]">Preview training max: <strong className="text-[#151714]">{hasPositiveNumber(oneRepMaxes[lift.key]) ? calculateTrainingMax(oneRepMaxes[lift.key]) : '—'} lb</strong></span>
                        </label>
                      ) : (
                        <dl className="mt-3 space-y-2 text-sm tabular-nums">
                          <div className="flex justify-between gap-4"><dt className="text-[#62675f]">1RM</dt><dd className="font-semibold">{saved?.oneRepMax ?? '—'} lb</dd></div>
                          <div className="flex justify-between gap-4"><dt className="text-[#62675f]">Training max</dt><dd className="font-semibold">{saved?.trainingMax ?? '—'} lb</dd></div>
                        </dl>
                      )}
                    </div>
                  );
                })}
              </div>
              {showEditor && canEditWeek && (
                <div className="flex flex-wrap items-center gap-3 border-t border-[#D2CFC7] py-4">
                  <button type="submit" disabled={saving || savingSet} className="btn-primary">{saving && operation === 'maxes' ? 'Saving…' : 'Save changes'}</button>
                  {stage !== 'setup' && stage !== 'maxes-needed' && <button type="button" disabled={saving} className="btn-secondary" onClick={cancelMaxEditing}>Cancel</button>}
                  <span className="text-sm text-[#747872]">Training max = 90% of 1RM, rounded to 5 lb.</span>
                </div>
              )}
            </form>
            {showEditor && selectedWeekGenerated && <p className="text-sm text-[#62675f]">Saving numbers does not change targets in already-generated workouts.</p>}
          </section>

          {stage === 'ready' && !showEditor && canEditWeek && (
            <div className="flex flex-wrap items-center gap-4 border-b border-[#D2CFC7] pb-8">
              <button type="button" className="btn-primary" disabled={saving || !selectedWeekMaxesReady} onClick={generateProgram}>{saving && operation === 'generate' ? 'Generating…' : `Generate Week ${programWeek}`}</button>
              <span className="text-sm text-[#62675f]">Four training days will be created.</span>
            </div>
          )}

          {(programWeeks.length > 0 || activeWeekNumber > 1) && (
            <section aria-labelledby="week-selector-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="week-selector-heading" className="section-title">Program weeks</h2>
                {selectedWeekGenerated && canEditWeek && <button type="button" className="btn-ghost" disabled={saving || savingSet} onClick={generateProgram}>Regenerate Week {programWeek}</button>}
              </div>
              <nav aria-label="Program weeks" className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[1, 2, 3, 4].map((week) => {
                  const status = getWeekViewStatus(week, activeWeekNumber, programWeeks);
                  const selected = Number(programWeek) === week;
                  return (
                    <button key={week} type="button" disabled={status === 'locked' || saving || savingSet} aria-current={selected ? 'step' : undefined} aria-label={`Week ${week}${week === 4 ? ', deload' : ''}: ${status}${selected ? ', selected' : ''}`} onClick={() => chooseWeek(week)}
                      className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm transition-colors ${selected ? 'border-[#2f4f46] bg-[#E8EDE9] text-[#203c33]' : status === 'locked' ? 'cursor-not-allowed border-[#D2CFC7] text-[#747872]' : 'border-[#D2CFC7] text-[#4F534E] hover:bg-[#F4F2EC]'}`}>
                      <span className="block font-semibold">Week {week}{week === 4 ? ' · Deload' : ''}</span>
                      <span className="text-xs">{status === 'locked' ? 'Locked' : status === 'completed' ? 'Completed' : 'Current'}</span>
                    </button>
                  );
                })}
              </nav>
              {activeWeekNumber < 4 && <p className="text-sm text-[#62675f]">Complete all four workouts in Week {activeWeekNumber} to unlock Week {activeWeekNumber + 1}.</p>}
            </section>
          )}

          {selectedWeekReadOnly && Number(programWeek) < 4 && (
            <div className="flex flex-wrap items-center gap-4 border-l-2 border-[#2f4f46] pl-4">
              <p className="font-medium">Week {programWeek} complete. Enter new maxes to generate Week {Number(programWeek) + 1}.</p>
              <button type="button" className="btn-secondary" onClick={() => chooseWeek(Number(programWeek) + 1)}>Start Week {Number(programWeek) + 1}</button>
            </div>
          )}
          {selectedWeekReadOnly && Number(programWeek) === 4 && <p className="border-l-2 border-[#2f4f46] pl-4 font-medium">Four-week block complete.</p>}

          {stage === 'workout' && activeWorkout && (
            <section aria-labelledby="workout-heading" className="space-y-6">
              <div>
                <h2 className="section-title">Training days</h2>
                <nav aria-label="Training days" className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {weekWorkouts.map((workout, index) => (
                    <button key={workout._id || index} type="button" disabled={saving || savingSet} aria-current={index === activeWorkoutIndex ? 'step' : undefined} onClick={() => chooseWorkout(index)}
                      className={`min-h-11 min-w-0 rounded-md border px-3 py-2 text-left text-sm ${index === activeWorkoutIndex ? 'border-[#2f4f46] bg-[#E8EDE9] text-[#203c33]' : 'border-[#D2CFC7] text-[#4F534E] hover:bg-[#F4F2EC]'}`}>
                      <span className="block font-semibold">Day {workout.programDay || index + 1} · {getWorkoutDayLabel(workout, index)}</span>
                      <span className="text-xs">{workout.status === 'completed' ? '✓ Completed' : 'Planned'}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="min-w-0 rounded-lg border border-[#D2CFC7] bg-[#FAF9F6] p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D2CFC7] pb-5">
                  <div>
                    <p className="eyebrow">{activeWorkout.status === 'completed' ? 'Workout completed' : activeWorkoutIndex === nextWorkoutIndex ? 'Up next' : 'Selected workout'} · Week {programWeek}, Day {activeWorkout.programDay || activeWorkoutIndex + 1}</p>
                    <h2 id="workout-heading" className="mt-2 text-2xl font-semibold text-[#151714] sm:text-3xl">{getWorkoutDayLabel(activeWorkout, activeWorkoutIndex)}</h2>
                    <p className="mt-2 text-sm text-[#4F534E]">{setProgress.completed} of {setProgress.total} sets completed</p>
                  </div>
                  {activeWorkout.status === 'completed' && hasNextWorkout && !selectedWeekReadOnly && (
                    <button type="button" className="btn-primary" onClick={() => chooseWorkout(nextWorkoutIndex)}>Open next workout</button>
                  )}
                </div>

                {savingSet && <p role="status" className="mt-3 text-sm text-[#4F534E]">Saving set…</p>}
                <div className="space-y-6">
                  {activeWorkout.exercises?.map((exercise, exerciseIndex) => (
                    <div key={`${exercise.exerciseName}-${exerciseIndex}`} className="min-w-0 pt-5">
                      {activeWorkout.exercises.length > 1 && <h3 className="mb-3 font-semibold">{exercise.exerciseName}</h3>}
                      <table className="hidden w-full text-left text-sm tabular-nums sm:table">
                        <caption className="sr-only">{exercise.exerciseName} set tracking. Weights in pounds.</caption>
                        <thead className="border-b border-[#D2CFC7] text-[#62675f]"><tr><th scope="col" className="py-3">Set</th><th scope="col" className="py-3">Weight</th><th scope="col" className="py-3">Reps</th><th scope="col" className="py-3 text-right">Done</th></tr></thead>
                        <tbody className="divide-y divide-[#D2CFC7]">
                          {exercise.sets?.map((set, setIndex) => (
                            <tr key={`${set.setNumber}-${setIndex}`} className={set.completed ? 'bg-[#F4F2EC]' : ''}>
                              <th scope="row" className="py-3 font-semibold">{set.setNumber}</th>
                              <td className="py-3 font-semibold">{set.weight ?? 0} <span className="font-normal text-[#62675f]">lb</span></td>
                              <td className="py-3">{set.targetReps || set.reps || 0}{set.isPlusSet ? '+' : ''}{set.isPlusSet && <span className="ml-2 badge-gold">Plus set</span>}</td>
                              <td className="py-2 text-right"><label className="inline-flex min-h-11 min-w-11 items-center justify-end"><span className="sr-only">{exercise.exerciseName} set {set.setNumber} {set.completed ? 'completed' : 'not completed'}</span><input type="checkbox" checked={Boolean(set.completed)} onChange={() => toggleSetCompletion(exerciseIndex, setIndex)} disabled={savingSet || saving || !canEditWeek} aria-label={`${exercise.exerciseName}, set ${set.setNumber}, mark ${set.completed ? 'incomplete' : 'complete'}`} className="h-5 w-5 accent-[#2f4f46]" /></label></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="divide-y divide-[#D2CFC7] border-y border-[#D2CFC7] sm:hidden">
                        {exercise.sets?.map((set, setIndex) => (
                          <div key={`${set.setNumber}-${setIndex}`} className="flex min-h-16 items-center justify-between gap-3 py-3 text-sm tabular-nums">
                            <div><p className="font-semibold">Set {set.setNumber} · {set.weight ?? 0} lb</p><p className="mt-1 text-[#4F534E]">{set.targetReps || set.reps || 0}{set.isPlusSet ? '+' : ''} reps {set.isPlusSet && <span className="badge-gold ml-1">Plus set</span>}</p></div>
                            <label className="flex min-h-11 min-w-11 items-center justify-center"><span className="sr-only">{exercise.exerciseName} set {set.setNumber} {set.completed ? 'completed' : 'not completed'}</span><input type="checkbox" checked={Boolean(set.completed)} onChange={() => toggleSetCompletion(exerciseIndex, setIndex)} disabled={savingSet || saving || !canEditWeek} aria-label={`${exercise.exerciseName}, set ${set.setNumber}, mark ${set.completed ? 'incomplete' : 'complete'}`} className="h-5 w-5 accent-[#2f4f46]" /></label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <details className="mt-5 border-t border-[#D2CFC7] pt-4 text-sm text-[#4F534E]"><summary className="w-fit cursor-pointer font-medium text-[#2f4f46]">Workout details</summary><p className="mt-3">Estimated volume: {getWorkoutEstimatedVolume(activeWorkout)} lb</p>{activeWorkout.notes && <p className="mt-2 break-words">{activeWorkout.notes}</p>}{activeWorkout.exercises?.map((exercise, index) => <p key={index} className="mt-1">{exercise.exerciseName}: {exercise.sets?.reduce((total, set) => total + getSetVolume(set), 0) || 0} lb estimated volume</p>)}</details>
                {activeWorkout.status === 'planned' && canEditWeek && <Link to={appPaths.train} state={{ plannedWorkoutId: activeWorkout._id }} className="btn-secondary mt-5">Open in Train</Link>}

                {hasPlusSet && (
                  <form onSubmit={updateProgression} className="mt-6 border-t border-[#D2CFC7] pt-5" aria-labelledby="plus-set-heading">
                    <h3 id="plus-set-heading" className="text-lg font-semibold">Plus-set result</h3>
                    <p className="mt-1 text-sm text-[#4F534E]">{canProgress ? `How many reps did you complete for ${getLiftLabel(activeLiftName)}?` : 'Progression for this week is view-only.'}</p>
                    <div className="mt-4 flex flex-wrap items-end gap-4">
                      <div className="min-w-28"><p className="text-sm text-[#62675f]">Current training max</p><p className="mt-1 text-xl font-semibold tabular-nums">{currentTrainingMax?.trainingMax ?? '—'} lb</p></div>
                      <label className="w-36 text-sm font-medium">Reps completed<input type="number" min="0" step="1" required className="form-field" disabled={saving || !canProgress} value={progressionForm.plusSetReps} onChange={(event) => setProgressionForm((current) => ({ ...current, plusSetReps: event.target.value }))} /></label>
                      <label className="min-w-48 flex-1 text-sm font-medium">Training note<input type="text" className="form-field" placeholder="Optional" disabled={saving || !canProgress} value={progressionForm.notes} onChange={(event) => setProgressionForm((current) => ({ ...current, notes: event.target.value }))} /></label>
                      <button type="submit" disabled={saving || savingSet || !canProgress} className="btn-primary">{saving && operation === 'progression' ? 'Applying…' : 'Apply progression'}</button>
                    </div>
                    {visibleProgressionResult && <div role="status" className="mt-5 border-l-2 border-[#2f4f46] pl-4"><p className="font-semibold">{visibleProgressionResult.oldTrainingMax} lb → {visibleProgressionResult.newTrainingMax} lb training max</p><p className="mt-1 text-sm text-[#4F534E]">{visibleProgressionResult.plusSetReps} reps · {visibleProgressionResult.increaseAmount > 0 ? '+' : ''}{visibleProgressionResult.increaseAmount} lb</p>{visibleProgressionResult.recommendation?.message && <p className="mt-2 text-sm text-[#4F534E]">{visibleProgressionResult.recommendation.message}</p>}</div>}
                  </form>
                )}
              </div>
            </section>
          )}

          {historyItems.length > 0 && <section className="border-t border-[#D2CFC7] pt-6" aria-labelledby="history-heading"><button type="button" className="flex min-h-11 w-full items-center justify-between gap-4 text-left" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen} aria-controls="program-history-panel"><span id="history-heading" className="section-title">Program history</span><span className="text-sm font-semibold text-[#2f4f46]">{historyOpen ? 'Hide' : 'Show'}</span></button>{historyOpen && <div id="program-history-panel" role="region" aria-label="Weekly max history" tabIndex="0" className="mt-4 overflow-x-auto rounded-md border border-[#D2CFC7]"><table className="w-full min-w-[1040px] text-left text-sm"><caption className="sr-only">One saved max entry per week. Weights in pounds.</caption><thead className="border-b border-[#D2CFC7] text-[#62675f]"><tr>{['Week', 'Squat 1RM', 'Bench 1RM', 'Deadlift 1RM', 'OHP 1RM', 'Squat TM', 'Bench TM', 'Deadlift TM', 'OHP TM', 'Created'].map((heading) => <th key={heading} scope="col" className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#D2CFC7]">{historyItems.map((item) => <tr key={item._id || item.week}><th scope="row" className="px-4 py-3">Week {item.week}</th>{lifts.map((lift) => <td key={`${lift.key}-1rm`} className="px-4 py-3">{item.maxes?.[lift.key]?.oneRepMax ?? '—'} lb</td>)}{lifts.map((lift) => <td key={`${lift.key}-tm`} className="px-4 py-3">{item.maxes?.[lift.key]?.trainingMax ?? '—'} lb</td>)}<td className="px-4 py-3">{formatDate(item.dateCreated || item.createdAt)}</td></tr>)}</tbody></table></div>}</section>}
        </>
      )}
    </section>
  );
}

export default StrengthProgram;
