import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { prService } from '../../services/prService';
import { progressService } from '../../services/progressService';
import { workoutService } from '../../services/workoutService';
import { trainingMaxService } from '../../services/trainingMaxService';
import { appPaths, progressSectionPaths } from '../../utils/navigation';
import { getUserFacingError } from '../../utils/apiError';
import TrainStart from '../../components/TrainStart/TrainStart.jsx';
import { createWorkoutDraft, WORKOUT_DRAFT_STORAGE_KEY } from '../../utils/templateWorkflow';

const today = () => new Date().toISOString().slice(0, 10);

const sectionHeadings = {
  overview: ['Progress', 'Overview', 'See how your training is developing over time.'],
  'log-workout': ['Train', 'Start Workout', 'Continue a planned session, use a template, or start fresh.'],
  'log-pr': ['Progress', 'Personal Records', 'Log a PR when you hit a new best. Review your records below.'],
  'training-history': ['Progress', 'Training History', 'Your completed sessions, exercises, and sets in one place.'],
  'body-metrics': ['Progress', 'Body Metrics', 'Track body measurements over time. Add a measurement below to begin.'],
};

const emptyProgressForm = {
  date: today(),
  bodyWeight: '',
  bodyFatPercentage: '',
  chest: '',
  waist: '',
  hips: '',
  arms: '',
  thighs: '',
  notes: '',
};

const emptyPrForm = {
  exerciseName: '',
  weight: '',
  reps: '',
  oneRepMax: '',
  estimatedOneRepMax: '',
  date: today(),
  notes: '',
};

const emptyWorkoutForm = {
  title: '',
  date: today(),
  type: 'strength',
  duration: '',
  notes: '',
  exercises: [],
};

const createExercise = () => ({
  exerciseName: '',
  muscleGroup: '',
  notes: '',
  sets: [],
});

const createSet = (setNumber) => ({
  setNumber,
  reps: '',
  weight: '',
  completed: true,
  isPlusSet: false,
  rpe: '',
});

const numberOrZero = (value) => (value === '' || value === undefined || value === null ? 0 : Number(value));

const estimateOneRepMax = (weight, reps) => {
  const numericWeight = Number(weight || 0);
  const numericReps = Number(reps || 0);

  if (!numericWeight || !numericReps) {
    return 0;
  }

  return numericReps === 1 ? Math.round(numericWeight) : Math.round(numericWeight * (1 + numericReps / 30));
};

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));

const formatShortDate = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(date));

const toProgressForm = (log) => ({
  date: log.date ? log.date.slice(0, 10) : today(),
  bodyWeight: log.bodyWeight ?? '',
  bodyFatPercentage: log.bodyFatPercentage ?? '',
  chest: log.measurements?.chest ?? '',
  waist: log.measurements?.waist ?? '',
  hips: log.measurements?.hips ?? '',
  arms: log.measurements?.arms ?? '',
  thighs: log.measurements?.thighs ?? '',
  notes: log.notes || '',
});

const toWorkoutForm = (workout) => ({
  title: workout.title || '',
  date: workout.date ? workout.date.slice(0, 10) : today(),
  type: workout.type || 'strength',
  duration: workout.duration ?? '',
  notes: workout.notes || '',
  exercises:
    workout.exercises?.map((exercise) => ({
      exerciseName: exercise.exerciseName || '',
      muscleGroup: exercise.muscleGroup || '',
      notes: exercise.notes || '',
      sets:
        exercise.sets?.map((set, index) => ({
          setNumber: set.setNumber || index + 1,
          reps: set.reps ?? '',
          weight: set.weight ?? '',
          targetReps: set.targetReps ?? '',
          completed: true,
          isPlusSet: Boolean(set.isPlusSet),
          rpe: set.rpe ?? '',
        })) || [],
    })) || [],
});

const getPRValue = (pr) => Number(pr.estimatedOneRepMax || pr.oneRepMax || pr.weight || 0);

function Progress({ activeSection = 'training-history' }) {
  const { logout } = useAuth();
  const realtime = useRealtime();
  const location = useLocation();
  const navigate = useNavigate();
  const [eyebrow, heading, description] = sectionHeadings[activeSection];

  const [workouts, setWorkouts] = useState([]);
  const [bodyLogs, setBodyLogs] = useState([]);
  const [prs, setPrs] = useState([]);
  const [trainingMaxes, setTrainingMaxes] = useState([]);
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm);
  const [progressForm, setProgressForm] = useState(emptyProgressForm);
  const [prForm, setPrForm] = useState(emptyPrForm);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [editingProgressId, setEditingProgressId] = useState(null);
  const [editingPrId, setEditingPrId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.success || '');
  const [workoutEditorOpen, setWorkoutEditorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const workoutPendingRef = useRef(false);
  const pageHeadingRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (activeSection === 'log-workout' || location.state?.success) pageHeadingRef.current?.focus();
  }, [workoutEditorOpen, activeSection]);
  useEffect(() => { if (error && activeSection === 'log-workout') errorRef.current?.focus(); }, [error, activeSection]);

  useEffect(() => {
    setError('');
    setSuccess(location.state?.success || '');
  }, [activeSection]);

  const loadWorkoutDraft = () => {
    const stateDraft = location.state?.workoutDraft;

    if (stateDraft) {
      return stateDraft;
    }

    try {
      const storedDraft = window.sessionStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY);
      return storedDraft ? JSON.parse(storedDraft) : null;
    } catch {
      try { window.sessionStorage.removeItem(WORKOUT_DRAFT_STORAGE_KEY); } catch { /* Storage may be disabled. */ }
      return null;
    }
  };

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return getUserFacingError(err, fallbackMessage);
  };

  const loadProgressData = async () => {
    setLoading(true);
    setError('');

    try {
      const [workoutResponse, progressResponse, prResponse] = await Promise.all([
        workoutService.getWorkouts(),
        progressService.getProgressLogs(),
        prService.getPRs(),
      ]);

      setWorkouts(workoutResponse.data || []);
      setBodyLogs(progressResponse.data || []);
      setPrs(prResponse.data || []);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load progress data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgressData();
  }, []);

  useEffect(() => {
    if (activeSection !== 'overview') return;
    let active = true;
    trainingMaxService.getTrainingMaxes()
      .then((response) => { if (active) setTrainingMaxes(response.data || []); })
      .catch(async (err) => {
        if (err.response?.status === 401) await logout();
        else if (active) setError(getUserFacingError(err, 'Unable to load strength trend.'));
      });
    return () => { active = false; };
  }, [activeSection, logout]);

  useEffect(() => {
    if (!realtime) return undefined;

    return realtime.subscribe(['workout.updated', 'workout.completed', 'progress.updated'], () => {
      loadProgressData();
    });
  }, [realtime]);

  useEffect(() => {
    if (activeSection !== 'log-workout') return;
    // An explicit planned-session link takes precedence over a recovery draft.
    if (location.state?.plannedWorkoutId) return;
    // A history edit carries the existing record, not a new template draft.
    if (location.state?.editingWorkout) {
      setWorkoutForm(toWorkoutForm(location.state.editingWorkout));
      setEditingWorkoutId(location.state.editingWorkout._id);
      setWorkoutEditorOpen(true);
      setEditingExercise(null);
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    const workoutDraft = loadWorkoutDraft();

    if (!workoutDraft) {
      return;
    }

    setWorkoutForm(toWorkoutForm({
      ...workoutDraft,
      status: 'completed',
      exercises: (workoutDraft.exercises || []).map((exercise) => ({
        ...exercise,
        sets: [],
      })),
    }));
    setEditingWorkoutId(null);
    setWorkoutEditorOpen(true);
    setEditingExercise(null);
    setError('');
    setSuccess(`${workoutDraft.templateName || workoutDraft.title} loaded. Add today's sets, reps, and weight.`);
    try { window.sessionStorage.removeItem(WORKOUT_DRAFT_STORAGE_KEY); } catch { /* Navigation state still works without storage. */ }
    navigate(location.pathname, { replace: true, state: null });
  }, [activeSection, location.state?.workoutDraft, location.state?.editingWorkout]);

  useEffect(() => {
    const plannedWorkoutId = location.state?.plannedWorkoutId;
    if (activeSection !== 'log-workout' || !plannedWorkoutId || loading) return;
    const workout = workouts.find((item) => item._id === plannedWorkoutId);
    if (workout) {
      setWorkoutForm(toWorkoutForm(workout));
      setEditingWorkoutId(workout._id);
      setWorkoutEditorOpen(true);
      setEditingExercise(null);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [activeSection, loading, location.state?.plannedWorkoutId, workouts]);

  const plannedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.status === 'planned').sort((a, b) => new Date(a.date) - new Date(b.date)),
    [workouts],
  );

  const completedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.status === 'completed').sort((a, b) => new Date(b.date) - new Date(a.date)),
    [workouts],
  );

  const recentPr = useMemo(() => [...prs].sort((a, b) => new Date(b.date) - new Date(a.date))[0], [prs]);
  const strengthChanges = useMemo(() => trainingMaxes.flatMap((lift) => {
    const history = [...(lift.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (history.length < 2) return [];
    return [{ name: lift.liftName.replace(/_/g, ' '), change: Number(history.at(-1).trainingMax) - Number(history[0].trainingMax) }];
  }), [trainingMaxes]);
  const trainingCount = completedWorkouts.length + plannedWorkouts.length + workouts.filter((workout) => workout.status === 'skipped').length;

  const setSection = (sectionId, state) => {
    navigate(progressSectionPaths[sectionId], { state });
  };

  const resetWorkoutForm = () => {
    setWorkoutForm({ ...emptyWorkoutForm, date: today(), exercises: [] });
    setEditingWorkoutId(null);
    setEditingExercise(null);
  };

  const startPlannedWorkout = (workout) => {
    setWorkoutForm(toWorkoutForm(workout));
    setEditingWorkoutId(workout._id);
    setWorkoutEditorOpen(true);
    setEditingExercise(null);
    setError('');
    setSuccess('');
  };

  const startBlankWorkout = () => {
    resetWorkoutForm();
    setWorkoutEditorOpen(true);
    setError('');
    setSuccess('');
  };

  const startTemplateWorkout = (template) => {
    setWorkoutForm(toWorkoutForm(createWorkoutDraft(template)));
    setEditingWorkoutId(null);
    setWorkoutEditorOpen(true);
    setEditingExercise(null);
    setError('');
    setSuccess(`${template.name} loaded. Add today's sets, reps, and weight.`);
  };

  const updateWorkoutField = (field, value) => {
    setWorkoutForm((current) => ({ ...current, [field]: value }));
  };

  const addWorkoutExercise = () => {
    setEditingExercise(workoutForm.exercises.length);
    setWorkoutForm((current) => ({
      ...current,
      exercises: [...current.exercises, createExercise()],
    }));
  };

  const updateWorkoutExercise = (exerciseIndex, field, value) => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, [field]: value } : exercise,
      ),
    }));
  };

  const removeWorkoutExercise = (exerciseIndex) => {
    setEditingExercise(null);
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.filter((_, index) => index !== exerciseIndex),
    }));
  };

  const addWorkoutSet = (exerciseIndex) => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, sets: [...exercise.sets, createSet(exercise.sets.length + 1)] } : exercise,
      ),
    }));
  };

  const updateWorkoutSet = (exerciseIndex, setIndex, field, value) => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, currentSetIndex) =>
                currentSetIndex === setIndex ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    }));
  };

  const removeWorkoutSet = (exerciseIndex, setIndex) => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets
                .filter((_, currentSetIndex) => currentSetIndex !== setIndex)
                .map((set, nextIndex) => ({ ...set, setNumber: nextIndex + 1 })),
            }
          : exercise,
      ),
    }));
  };

  const saveWorkout = async (event) => {
    event.preventDefault();
    if (workoutPendingRef.current) return;
    setError('');
    setSuccess('');

    if (!workoutForm.title.trim()) {
      setError('Workout name is required.');
      return;
    }

    if (!workoutForm.exercises.some((exercise) => exercise.exerciseName.trim())) {
      setError('Add at least one exercise before saving a workout.');
      return;
    }

    workoutPendingRef.current = true;
    setSaving(true);

    const payload = {
      title: workoutForm.title.trim(),
      date: workoutForm.date,
      type: workoutForm.type || 'strength',
      status: 'completed',
      duration: numberOrZero(workoutForm.duration),
      notes: workoutForm.notes,
      exercises: workoutForm.exercises
        .filter((exercise) => exercise.exerciseName.trim())
        .map((exercise) => ({
          exerciseName: exercise.exerciseName.trim(),
          muscleGroup: exercise.muscleGroup,
          notes: exercise.notes,
          sets: exercise.sets.map((set, index) => ({
            setNumber: index + 1,
            reps: numberOrZero(set.reps),
            weight: numberOrZero(set.weight),
            targetReps: numberOrZero(set.targetReps),
            completed: Boolean(set.completed),
            isPlusSet: Boolean(set.isPlusSet),
            rpe: numberOrZero(set.rpe),
          })),
        })),
    };

    try {
      if (editingWorkoutId) {
        await workoutService.updateWorkout(editingWorkoutId, payload);
      } else {
        await workoutService.createWorkout(payload);
      }

      resetWorkoutForm();
      setWorkoutEditorOpen(false);
      setSuccess('Workout saved to Training History.');
      await loadProgressData();
      setSection('training-history', { success: 'Workout saved to Training History.' });
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save workout.'));
    } finally {
      workoutPendingRef.current = false;
      setSaving(false);
    }
  };

  const handleProgressChange = (event) => {
    const { name, value } = event.target;
    setProgressForm((current) => ({ ...current, [name]: value }));
  };

  const resetProgressForm = () => {
    setProgressForm({ ...emptyProgressForm, date: today() });
    setEditingProgressId(null);
  };

  const saveBodyMetrics = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = {
      date: progressForm.date,
      bodyWeight: numberOrZero(progressForm.bodyWeight),
      bodyFatPercentage: numberOrZero(progressForm.bodyFatPercentage),
      measurements: {
        chest: numberOrZero(progressForm.chest),
        waist: numberOrZero(progressForm.waist),
        hips: numberOrZero(progressForm.hips),
        arms: numberOrZero(progressForm.arms),
        thighs: numberOrZero(progressForm.thighs),
      },
      notes: progressForm.notes,
    };

    try {
      if (editingProgressId) {
        await progressService.updateProgressLog(editingProgressId, payload);
      } else {
        await progressService.createProgressLog(payload);
      }

      resetProgressForm();
      setSuccess(editingProgressId ? 'Body metrics updated.' : 'Body metrics logged.');
      await loadProgressData();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save body metrics.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteBodyMetrics = async (logId) => {
    if (!window.confirm('Delete this body metrics log?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await progressService.deleteProgressLog(logId);
      if (editingProgressId === logId) {
        resetProgressForm();
      }
      setSuccess('Body metrics log deleted.');
      await loadProgressData();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to delete body metrics.'));
    }
  };

  const handlePrChange = (event) => {
    const { name, value } = event.target;
    setPrForm((current) => {
      const next = { ...current, [name]: value };

      if (name === 'weight' || name === 'reps') {
        next.estimatedOneRepMax = estimateOneRepMax(name === 'weight' ? value : next.weight, name === 'reps' ? value : next.reps) || '';
      }

      return next;
    });
  };

  const resetPrForm = () => {
    setPrForm({ ...emptyPrForm, date: today() });
    setEditingPrId(null);
  };

  const savePr = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!prForm.exerciseName.trim()) {
      setError('Exercise name is required.');
      return;
    }

    setSaving(true);

    const payload = {
      exerciseName: prForm.exerciseName.trim(),
      weight: numberOrZero(prForm.weight),
      reps: numberOrZero(prForm.reps),
      oneRepMax: numberOrZero(prForm.oneRepMax),
      estimatedOneRepMax: numberOrZero(prForm.estimatedOneRepMax) || estimateOneRepMax(prForm.weight, prForm.reps),
      date: prForm.date,
      notes: prForm.notes,
    };

    try {
      if (editingPrId) {
        await prService.updatePR(editingPrId, payload);
      } else {
        await prService.createPR(payload);
      }

      resetPrForm();
      setSuccess(editingPrId ? 'Personal record updated.' : 'Personal record logged.');
      await loadProgressData();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save personal record.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-stack">
      <header className="page-header">
        <p className="eyebrow">{eyebrow}</p>
        <h1 ref={pageHeadingRef} tabIndex={-1} className="page-title">{activeSection === 'log-workout' && workoutEditorOpen ? 'Log Workout' : heading}</h1>
        <p className="page-copy">{activeSection === 'log-workout' && workoutEditorOpen ? 'Record this session. Changes here do not change your saved templates.' : description}</p>
      </header>

      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="status-error">{error}</p>}
      {success && <p role="status" className="status-success">{success}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3" role="status" aria-label="Loading training log">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skeleton-panel h-32" />
          ))}
        </div>
      ) : (
        <>
          {activeSection === 'overview' && (
            <div className="space-y-10">
              <section aria-label="Progress at a glance" className="grid gap-6 border-b border-[#D2CFC7] pb-8 sm:grid-cols-2 lg:grid-cols-4">
                <div className="border-t border-[#D2CFC7] pt-4">
                  <h2 className="eyebrow">Recent training</h2>
                  {completedWorkouts[0] ? <><p className="mt-2 break-words text-lg font-semibold">{completedWorkouts[0].title}</p><p className="mt-1 text-sm text-[#62675f]">{formatDate(completedWorkouts[0].date)}</p></> : <p className="mt-2 text-sm text-[#62675f]">No workout history yet.</p>}
                  <Link to={completedWorkouts.length ? appPaths.history : appPaths.train} className="mt-3 inline-block text-sm font-semibold text-[#2f4f46] underline underline-offset-4">{completedWorkouts.length ? 'View history' : 'Start Workout'}</Link>
                </div>
                <div className="border-t border-[#D2CFC7] pt-4">
                  <h2 className="eyebrow">Consistency</h2>
                  <p className="mt-2 text-lg font-semibold">{trainingCount ? `${Math.round(completedWorkouts.length / trainingCount * 100)}% completed` : 'No sessions yet'}</p>
                  {trainingCount > 0 && <p className="mt-1 text-sm text-[#62675f]">{completedWorkouts.length} of {trainingCount} scheduled sessions</p>}
                </div>
                <div className="border-t border-[#D2CFC7] pt-4">
                  <h2 className="eyebrow">Recent PR</h2>
                  <p className="mt-2 break-words text-lg font-semibold">{recentPr ? `${recentPr.exerciseName} · ${getPRValue(recentPr)} lb` : 'No PRs yet'}</p>
                  <Link to={appPaths.prs} className="mt-3 inline-block text-sm font-semibold text-[#2f4f46] underline underline-offset-4">{recentPr ? 'View PRs' : 'Log PR'}</Link>
                </div>
                <div className="border-t border-[#D2CFC7] pt-4">
                  <h2 className="eyebrow">Current strength trend</h2>
                  <p className="mt-2 text-lg font-semibold">{strengthChanges.length ? `${strengthChanges.filter((lift) => lift.change > 0).length} of ${strengthChanges.length} lifts improving` : 'Not enough history yet'}</p>
                  <Link to={appPaths.analytics} className="mt-3 inline-block text-sm font-semibold text-[#2f4f46] underline underline-offset-4">View analytics</Link>
                </div>
              </section>
              <section>
                <h2 className="section-title">Keep moving</h2>
                <p className="section-copy">Your next workout and detailed trends live in their own sections.</p>
                <div className="mt-5 flex flex-wrap gap-3"><Link to={appPaths.train} className="btn-primary min-h-11">Start Workout</Link><Link to={appPaths.history} className="btn-secondary min-h-11">Training History</Link></div>
              </section>
            </div>
          )}
          {activeSection === 'log-workout' && !workoutEditorOpen && (
            <TrainStart plannedWorkouts={plannedWorkouts} onStartPlanned={startPlannedWorkout} onStartBlank={startBlankWorkout} onStartTemplate={startTemplateWorkout} />
          )}

          {activeSection === 'log-workout' && workoutEditorOpen && (
            <section className="min-w-0" aria-label="Workout session">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">{editingWorkoutId ? 'Selected session' : 'New session'}</h2>
                  <p className="section-copy">Save when your workout is complete.</p>
                </div>
                <button type="button" disabled={saving} onClick={() => {
                  if (!window.confirm('Discard unsaved session changes and return to Train? Saved workouts and templates will not be changed.')) return;
                  resetWorkoutForm(); setWorkoutEditorOpen(false); setError(''); setSuccess('');
                }} className="btn-secondary min-h-11">Cancel Workout</button>
              </div>

              <form onSubmit={saveWorkout} className="mt-6 space-y-6">
                <fieldset disabled={saving} className="min-w-0 space-y-6">
                <h3 className="eyebrow">Workout Details</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-stone-300">Workout name</span>
                    <input value={workoutForm.title} onChange={(event) => updateWorkoutField('title', event.target.value)} className="form-field" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-300">Date</span>
                    <input type="date" value={workoutForm.date} onChange={(event) => updateWorkoutField('date', event.target.value)} className="form-field" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-300">Duration (minutes)</span>
                    <input type="number" min="0" value={workoutForm.duration} onChange={(event) => updateWorkoutField('duration', event.target.value)} className="form-field" />
                  </label>
                  <label className="block md:col-span-4">
                    <span className="text-sm font-medium text-stone-300">Notes</span>
                    <textarea rows="2" value={workoutForm.notes} onChange={(event) => updateWorkoutField('notes', event.target.value)} className="form-field" />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-stone-50">Exercises</h3>
                  <button type="button" onClick={addWorkoutExercise} className="btn-secondary px-3">
                    Add Exercise
                  </button>
                </div>

                {workoutForm.exercises.length === 0 ? (
                  <p className="empty-state">Add your first exercise, then record the sets you perform.</p>
                ) : (
                  <div className="space-y-7">
                    {workoutForm.exercises.map((exercise, exerciseIndex) => (
                      <article
                        key={`workout-exercise-${exerciseIndex}`}
                        aria-labelledby={`workout-exercise-${exerciseIndex}-heading`}
                        className="rounded-lg border border-[#D2CFC7] bg-[#FAF9F6] p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1 basis-56">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#62675f]">
                              Exercise {exerciseIndex + 1}
                            </p>
                            <h3 id={`workout-exercise-${exerciseIndex}-heading`} className="mt-2 break-words text-xl font-semibold text-[#151714]">
                              {exercise.exerciseName || 'Untitled Exercise'}
                            </h3>
                            <p className="mt-1 text-sm text-[#62675f]">
                              {exercise.muscleGroup || 'Muscle group not set'}
                            </p>
                            {exercise.notes && editingExercise !== exerciseIndex && <p className="mt-2 break-words text-sm text-[#62675f]">{exercise.notes}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn-secondary min-h-11 px-3" aria-expanded={editingExercise === exerciseIndex}
                              aria-controls={`workout-exercise-${exerciseIndex}-details`}
                              aria-label={`${editingExercise === exerciseIndex ? 'Finish editing' : 'Edit'} ${exercise.exerciseName || 'new exercise'} details`}
                              onClick={() => setEditingExercise(editingExercise === exerciseIndex ? null : exerciseIndex)}>
                              {editingExercise === exerciseIndex ? 'Done' : 'Edit details'}
                            </button>
                            <button type="button" onClick={() => removeWorkoutExercise(exerciseIndex)} className="min-h-11 px-3 text-sm text-[#62675f] underline underline-offset-4"
                              aria-label={`Remove ${exercise.exerciseName || 'new exercise'} from workout`}>Remove</button>
                          </div>
                        </div>

                        {editingExercise === exerciseIndex && (
                          <div id={`workout-exercise-${exerciseIndex}-details`} className="mt-5 grid gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className="text-sm font-medium text-stone-300">Exercise name</span>
                              <input autoFocus value={exercise.exerciseName} onChange={(event) => updateWorkoutExercise(exerciseIndex, 'exerciseName', event.target.value)} className="form-field" />
                            </label>
                            <label className="block">
                              <span className="text-sm font-medium text-stone-300">Muscle group</span>
                              <input value={exercise.muscleGroup} onChange={(event) => updateWorkoutExercise(exerciseIndex, 'muscleGroup', event.target.value)} className="form-field" />
                            </label>
                            <label className="block md:col-span-2">
                              <span className="text-sm font-medium text-stone-300">Exercise notes</span>
                              <textarea rows="2" value={exercise.notes} onChange={(event) => updateWorkoutExercise(exerciseIndex, 'notes', event.target.value)} className="form-field" />
                            </label>
                          </div>
                        )}

                        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#D2CFC7] pt-4">
                          <p className="text-sm font-semibold text-[#62675f]">Sets · {exercise.sets.length}</p>
                          <button type="button" onClick={() => addWorkoutSet(exerciseIndex)} className="btn-secondary min-h-11 px-3" aria-label={`Add set to ${exercise.exerciseName || 'new exercise'}`}>
                            Add Set
                          </button>
                        </div>

                        {exercise.sets.length === 0 ? (
                          <p className="mt-4 text-sm text-[#62675f]">
                            No sets logged yet. Add sets for today's workout only.
                          </p>
                        ) : (
                          <div className="mt-4 divide-y divide-[#D2CFC7] border-y border-[#D2CFC7]">
                            {exercise.sets.map((set, setIndex) => (
                              <fieldset key={`workout-set-${setIndex}`} className="grid min-w-0 grid-cols-2 gap-3 py-4 md:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)_100px_auto] md:items-end">
                                <legend className="sr-only">{exercise.exerciseName || 'New exercise'} set {setIndex + 1}</legend>
                                <div className="col-span-2 text-sm font-semibold text-[#4F534E] md:col-span-1">Set {setIndex + 1}</div>
                                <label className="block">
                                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">Reps</span>
                                  <input type="number" min="0" value={set.reps} onChange={(event) => updateWorkoutSet(exerciseIndex, setIndex, 'reps', event.target.value)} className="form-field" />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">Weight</span>
                                  <div className="flex items-center gap-2">
                                    <input type="number" min="0" value={set.weight} onChange={(event) => updateWorkoutSet(exerciseIndex, setIndex, 'weight', event.target.value)} className="form-field" />
                                    <span className="mt-1 text-sm font-medium text-[#62675f]">lb</span>
                                  </div>
                                </label>
                                <label className="flex min-h-11 items-center gap-2 text-sm text-stone-300">
                                  <input
                                    type="checkbox"
                                    checked={set.isPlusSet}
                                    onChange={(event) => updateWorkoutSet(exerciseIndex, setIndex, 'isPlusSet', event.target.checked)}
                                    className="h-5 w-5 rounded accent-[#2f4f46]"
                                  />
                                  Plus set
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeWorkoutSet(exerciseIndex, setIndex)}
                                  className="min-h-11 px-3 text-sm text-[#62675f] underline underline-offset-4"
                                  aria-label={`Remove ${exercise.exerciseName || 'new exercise'} set ${setIndex + 1}`}
                                >
                                  Remove
                                </button>
                              </fieldset>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                <button type="submit" disabled={saving} className="btn-primary min-h-11">
                  {saving ? 'Saving...' : 'Save Workout'}
                </button>
                </fieldset>
              </form>
            </section>
          )}

          {activeSection === 'log-pr' && (
            <section className="quiet-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">{editingPrId ? 'Edit Personal Record' : 'Log Personal Record'}</h2>
                  <p className="section-copy">Record a personal best and review your previous records below.</p>
                </div>
                {editingPrId && (
                  <button type="button" onClick={resetPrForm} className="btn-secondary px-3">
                    Cancel Edit
                  </button>
                )}
              </div>
              <form onSubmit={savePr} className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-stone-300">Exercise</span>
                  <input name="exerciseName" value={prForm.exerciseName} onChange={handlePrChange} className="form-field" required />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Weight</span>
                  <input type="number" min="0" name="weight" value={prForm.weight} onChange={handlePrChange} className="form-field" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Reps</span>
                  <input type="number" min="0" name="reps" value={prForm.reps} onChange={handlePrChange} className="form-field" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">1RM</span>
                  <input type="number" min="0" name="oneRepMax" value={prForm.oneRepMax} onChange={handlePrChange} className="form-field" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Estimated 1RM</span>
                  <input type="number" min="0" name="estimatedOneRepMax" value={prForm.estimatedOneRepMax} onChange={handlePrChange} className="form-field" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Date</span>
                  <input type="date" name="date" value={prForm.date} onChange={handlePrChange} className="form-field" />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-stone-300">Notes</span>
                  <textarea name="notes" rows="3" value={prForm.notes} onChange={handlePrChange} className="form-field" />
                </label>
                <button type="submit" disabled={saving} className="btn-primary md:col-span-2 md:w-fit">
                  {saving ? 'Saving...' : editingPrId ? 'Update PR' : 'Log PR'}
                </button>
              </form>
              <div className="mt-8 border-t border-stone-800 pt-5">
                <h3 className="section-title">PR History</h3>
                {prs.length === 0 ? (
                  <p className="mt-3 text-sm text-stone-500">Your personal records will appear here after you log your first PR.</p>
                ) : (
                  <div className="mt-3 divide-y divide-stone-800">
                    {prs.map((pr) => (
                      <div key={pr._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div className="min-w-0">
                          <h4 className="break-words font-semibold text-stone-100">{pr.exerciseName}</h4>
                          <p className="mt-1 text-sm text-stone-500">{formatDate(pr.date)} · {Number(pr.weight || 0)} lb x {Number(pr.reps || 0)} · Best 1RM {getPRValue(pr)} lb</p>
                        </div>
                        <button type="button" className="btn-secondary" onClick={() => {
                          setPrForm({ ...emptyPrForm, ...pr, date: pr.date.slice(0, 10) });
                          setEditingPrId(pr._id);
                          setError('');
                          setSuccess('');
                        }}>Edit PR</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeSection === 'training-history' && (
            <section className="space-y-5">
              <div>
                <h2 className="section-title">Completed sessions</h2>
                <p className="section-copy">Review completed sessions. Expand a workout to see its exercises and sets.</p>
              </div>

              {completedWorkouts.length === 0 ? (
                <div className="border-y border-[#D2CFC7] py-8">
                  <p className="font-semibold">No workout history yet.</p>
                  <p className="mt-2 text-sm text-stone-500">Record a session to review your exercises and performance over time.</p>
                  <Link to={appPaths.train} className="btn-primary mt-5">Start Workout</Link>
                </div>
              ) : (
                <div className="divide-y divide-stone-800 border-y border-stone-800">
                  {completedWorkouts.map((workout) => (
                    <details key={workout._id} className="group py-4">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2f4f46]">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{formatShortDate(workout.date)}</p>
                          <h3 className="mt-1 break-words text-base font-semibold text-stone-50">{workout.title}</h3>
                          <p className="mt-1 text-sm text-stone-500">
                            {workout.exercises?.length || 0} exercises
                            {` · ${workout.exercises?.reduce((count, exercise) => count + (exercise.sets?.length || 0), 0) || 0} sets`}
                            {workout.duration ? ` · ${workout.duration} min` : ''}
                            {workout.totalVolume ? ` · ${Number(workout.totalVolume)} lb volume` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              setSection('log-workout', { editingWorkout: workout });
                            }}
                            className="btn-secondary px-3"
                          >
                            Edit
                          </button>
                          <span className="text-lg font-semibold text-stone-500 group-open:hidden" aria-hidden="true">⌄</span>
                          <span className="hidden text-lg font-semibold text-stone-500 group-open:inline" aria-hidden="true">⌃</span>
                        </div>
                      </summary>

                      <div className="mt-5 space-y-4">
                        {workout.exercises?.map((exercise, exerciseIndex) => (
                          <div key={`${workout._id}-${exercise.exerciseName}-${exerciseIndex}`} className="border-l border-stone-800 pl-4">
                            <h4 className="font-semibold text-stone-100">{exercise.exerciseName}</h4>
                            {exercise.notes && <p className="mt-1 text-sm text-stone-500">{exercise.notes}</p>}
                            {exercise.sets?.length ? (
                              <div className="mt-2 space-y-1 text-sm text-stone-400">
                                {exercise.sets.map((set, setIndex) => (
                                  <p key={`${workout._id}-${exerciseIndex}-${setIndex}`}>
                                    Set {setIndex + 1} - {Number(set.weight || 0)} lb x {Number(set.reps || 0)}
                                    {set.isPlusSet ? ' · Plus set' : ''}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-stone-500">No sets logged.</p>
                            )}
                          </div>
                        ))}
                        {workout.notes && <p className="border-t border-stone-800 pt-4 text-sm text-stone-500">Notes: {workout.notes}</p>}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </section>
          )}


          {activeSection === 'body-metrics' && (
            <section className="space-y-6">
              <form onSubmit={saveBodyMetrics} className="quiet-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">{editingProgressId ? 'Edit Body Metrics' : 'Log Body Metrics'}</h2>
                    <p className="section-copy">Track body weight, measurements, and notes without mixing them into workout logs.</p>
                  </div>
                  {editingProgressId && (
                    <button type="button" onClick={resetProgressForm} className="btn-secondary px-3">
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-medium text-stone-300">Date</span>
                    <input type="date" name="date" value={progressForm.date} onChange={handleProgressChange} className="form-field" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-300">Body weight</span>
                    <input type="number" name="bodyWeight" min="0" step="0.1" value={progressForm.bodyWeight} onChange={handleProgressChange} className="form-field" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-300">Body fat %</span>
                    <input type="number" name="bodyFatPercentage" min="0" max="100" step="0.1" value={progressForm.bodyFatPercentage} onChange={handleProgressChange} className="form-field" />
                  </label>
                  {['chest', 'waist', 'hips', 'arms', 'thighs'].map((field) => (
                    <label key={field} className="block">
                      <span className="text-sm font-medium capitalize text-stone-300">{field}</span>
                      <input type="number" name={field} min="0" step="0.1" value={progressForm[field]} onChange={handleProgressChange} className="form-field" />
                    </label>
                  ))}
                  <label className="block md:col-span-3">
                    <span className="text-sm font-medium text-stone-300">Notes</span>
                    <textarea name="notes" value={progressForm.notes} onChange={handleProgressChange} rows="3" className="form-field" />
                  </label>
                </div>

                <button type="submit" disabled={saving} className="btn-primary mt-6">
                  {saving ? 'Saving...' : editingProgressId ? 'Update Metrics' : 'Save Metrics'}
                </button>
              </form>

              <section className="space-y-4">
                <h2 className="section-title">Body Metrics History</h2>
                {bodyLogs.length === 0 ? (
                  <p className="empty-state">Log body metrics to review your measurement history.</p>
                ) : (
                  <div className="divide-y divide-[#D2CFC7] border-y border-[#D2CFC7]">
                    {bodyLogs.map((log) => (
                      <article key={log._id} className="py-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-stone-100">{formatDate(log.date)}</h3>
                            <p className="mt-1 text-sm text-stone-500">{log.bodyWeight != null ? `${log.bodyWeight} lb` : 'Weight not logged'}{log.bodyFatPercentage != null ? ` · ${log.bodyFatPercentage}% body fat` : ''}</p>
                          </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          {['chest', 'waist', 'hips', 'arms', 'thighs'].map((field) => (
                            <div key={field}>
                              <dt className="capitalize text-stone-500">{field}</dt>
                              <dd className="font-medium text-stone-100">{log.measurements?.[field] ?? '—'}</dd>
                            </div>
                          ))}
                        </dl>
                        {log.notes && <p className="mt-4 text-sm text-stone-400">{log.notes}</p>}
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProgressId(log._id);
                              setProgressForm(toProgressForm(log));
                            }}
                            className="btn-secondary px-3"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBodyMetrics(log._id)}
                            className="btn-danger"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </section>
          )}
        </>
      )}
    </section>
  );
}

export default Progress;
