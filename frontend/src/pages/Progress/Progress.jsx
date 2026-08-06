import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { prService } from '../../services/prService';
import { progressService } from '../../services/progressService';
import { workoutService } from '../../services/workoutService';

const today = () => new Date().toISOString().slice(0, 10);

const sections = [
  { id: 'log-workout', label: 'Log Workout' },
  { id: 'log-pr', label: 'Log PR' },
  { id: 'training-history', label: 'Training History' },
  { id: 'personal-records', label: 'Personal Records' },
  { id: 'strength-progress', label: 'Strength Progress' },
  { id: 'body-metrics', label: 'Body Metrics' },
];

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
  targetReps: '',
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
  }).format(new Date(date));

const shortDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));

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

const toPrForm = (pr) => ({
  exerciseName: pr.exerciseName || '',
  weight: pr.weight ?? '',
  reps: pr.reps ?? '',
  oneRepMax: pr.oneRepMax ?? '',
  estimatedOneRepMax: pr.estimatedOneRepMax ?? '',
  date: pr.date ? pr.date.slice(0, 10) : today(),
  notes: pr.notes || '',
});

const getPRValue = (pr) => Number(pr.estimatedOneRepMax || pr.oneRepMax || pr.weight || 0);
const normalizeExercise = (name) => name?.trim().toLowerCase() || 'unknown';

function MiniMetric({ label, value, detail }) {
  return (
    <div className="border-t border-stone-800 pt-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">{value}</p>
      {detail && <p className="mt-1 text-sm text-stone-400">{detail}</p>}
    </div>
  );
}

function Progress() {
  const { logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section') || 'log-workout';
  const activeSection = sections.some((section) => section.id === requestedSection) ? requestedSection : 'log-workout';

  const [workouts, setWorkouts] = useState([]);
  const [bodyLogs, setBodyLogs] = useState([]);
  const [prs, setPrs] = useState([]);
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm);
  const [progressForm, setProgressForm] = useState(emptyProgressForm);
  const [prForm, setPrForm] = useState(emptyPrForm);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [editingProgressId, setEditingProgressId] = useState(null);
  const [editingPrId, setEditingPrId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return err.response?.data?.message || fallbackMessage;
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

  const plannedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.status === 'planned').sort((a, b) => new Date(a.date) - new Date(b.date)),
    [workouts],
  );

  const completedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.status === 'completed').sort((a, b) => new Date(b.date) - new Date(a.date)),
    [workouts],
  );

  const derivedWorkoutPrs = useMemo(() => {
    const bestByExercise = new Map();

    completedWorkouts.forEach((workout) => {
      workout.exercises?.forEach((exercise) => {
        exercise.sets?.forEach((set) => {
          if (!set.completed || !Number(set.weight) || !Number(set.reps)) {
            return;
          }

          const estimatedOneRepMax = estimateOneRepMax(set.weight, set.reps);
          const key = normalizeExercise(exercise.exerciseName);
          const current = bestByExercise.get(key);

          if (!current || estimatedOneRepMax > current.estimatedOneRepMax) {
            bestByExercise.set(key, {
              exerciseName: exercise.exerciseName,
              weight: Number(set.weight),
              reps: Number(set.reps),
              estimatedOneRepMax,
              date: workout.date,
              source: workout.title,
            });
          }
        });
      });
    });

    return [...bestByExercise.values()].sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax);
  }, [completedWorkouts]);

  const prSummary = useMemo(() => {
    const newest = [...prs].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))[0];
    const highest = [...prs].sort((a, b) => getPRValue(b) - getPRValue(a))[0];
    const chartData = [...prs]
      .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
      .map((pr) => ({
        label: shortDate(pr.date || pr.createdAt),
        estimatedOneRepMax: getPRValue(pr),
      }));

    return { newest, highest, chartData };
  }, [prs]);

  const strengthChartData = useMemo(() => {
    const volumeByDate = completedWorkouts.reduce((groups, workout) => {
      const key = workout.date?.slice(0, 10);
      groups[key] = (groups[key] || 0) + Number(workout.totalVolume || 0);
      return groups;
    }, {});

    return Object.entries(volumeByDate)
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
      .map(([date, volume]) => ({ label: shortDate(date), volume }));
  }, [completedWorkouts]);

  const setSection = (sectionId) => {
    setSearchParams({ section: sectionId });
  };

  const resetWorkoutForm = () => {
    setWorkoutForm({ ...emptyWorkoutForm, date: today(), exercises: [] });
    setEditingWorkoutId(null);
  };

  const handlePlannedWorkoutSelect = (event) => {
    const workoutId = event.target.value;
    const workout = workouts.find((item) => item._id === workoutId);

    if (!workout) {
      resetWorkoutForm();
      return;
    }

    setWorkoutForm(toWorkoutForm(workout));
    setEditingWorkoutId(workout._id);
    setError('');
    setSuccess('');
  };

  const updateWorkoutField = (field, value) => {
    setWorkoutForm((current) => ({ ...current, [field]: value }));
  };

  const addWorkoutExercise = () => {
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
      setSuccess('Workout saved to Progress.');
      await loadProgressData();
      setSection('training-history');
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save workout.'));
    } finally {
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
      setSection('personal-records');
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save personal record.'));
    } finally {
      setSaving(false);
    }
  };

  const deletePr = async (prId) => {
    setError('');
    setSuccess('');

    try {
      await prService.deletePR(prId);
      if (editingPrId === prId) {
        resetPrForm();
      }
      setSuccess('Personal record deleted.');
      await loadProgressData();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to delete personal record.'));
    }
  };

  return (
    <section className="page-stack">
      <header className="border-b border-stone-800 pb-8">
        <p className="eyebrow">Training Progress</p>
        <h1 className="page-title">Progress</h1>
        <p className="page-copy">
          Log workouts, review training history, track personal records, and keep body metrics in one focused place.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" aria-label="Progress sections">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setSection(section.id)}
            className={activeSection === section.id ? 'btn-primary px-3' : 'btn-secondary px-3'}
          >
            {section.label}
          </button>
        ))}
      </div>

      {error && <p className="status-error">{error}</p>}
      {success && <p className="status-success">{success}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3" aria-label="Loading progress">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg border border-stone-800 bg-stone-900/40" />
          ))}
        </div>
      ) : (
        <>
          {activeSection === 'log-workout' && (
            <section className="quiet-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">Log Workout</h2>
                  <p className="section-copy">Start from a planned template workout, customize today's exercises, then save it as completed.</p>
                </div>
                {editingWorkoutId && (
                  <button type="button" onClick={resetWorkoutForm} className="btn-secondary px-3">
                    Clear Selection
                  </button>
                )}
              </div>

              <label className="mt-6 block">
                <span className="text-sm font-medium text-stone-300">Planned workout from Templates</span>
                <select value={editingWorkoutId || ''} onChange={handlePlannedWorkoutSelect} className="form-field">
                  <option value="">Create a workout manually or select a planned workout</option>
                  {plannedWorkouts.map((workout) => (
                    <option key={workout._id} value={workout._id}>
                      {workout.title} - {formatDate(workout.date)}
                    </option>
                  ))}
                </select>
              </label>

              {plannedWorkouts.length === 0 && (
                <p className="empty-state mt-4">
                  No planned template workouts yet. Open Templates, choose a routine, and create today's workout.
                </p>
              )}

              <form onSubmit={saveWorkout} className="mt-6 space-y-6">
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
                    <span className="text-sm font-medium text-stone-300">Duration</span>
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
                  <p className="empty-state">Add exercises or select a planned template workout above.</p>
                ) : (
                  <div className="space-y-4">
                    {workoutForm.exercises.map((exercise, exerciseIndex) => (
                      <article key={`workout-exercise-${exerciseIndex}`} className="rounded-xl border border-stone-800 bg-stone-950/35 p-4">
                        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                          <label className="block">
                            <span className="text-sm font-medium text-stone-300">Exercise name</span>
                            <input value={exercise.exerciseName} onChange={(event) => updateWorkoutExercise(exerciseIndex, 'exerciseName', event.target.value)} className="form-field" />
                          </label>
                          <label className="block">
                            <span className="text-sm font-medium text-stone-300">Muscle group</span>
                            <input value={exercise.muscleGroup} onChange={(event) => updateWorkoutExercise(exerciseIndex, 'muscleGroup', event.target.value)} className="form-field" />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeWorkoutExercise(exerciseIndex)}
                            className="rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/30"
                          >
                            Remove Exercise
                          </button>
                        </div>

                        <label className="mt-4 block">
                          <span className="text-sm font-medium text-stone-300">Exercise notes</span>
                          <textarea rows="2" value={exercise.notes} onChange={(event) => updateWorkoutExercise(exerciseIndex, 'notes', event.target.value)} className="form-field" />
                        </label>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-800 pt-4">
                          <p className="text-sm font-semibold text-stone-200">Sets</p>
                          <button type="button" onClick={() => addWorkoutSet(exerciseIndex)} className="btn-secondary px-3">
                            Add Set
                          </button>
                        </div>

                        {exercise.sets.length === 0 ? (
                          <p className="mt-4 rounded-lg border border-dashed border-stone-800 px-4 py-3 text-sm text-stone-500">
                            No sets logged yet.
                          </p>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {exercise.sets.map((set, setIndex) => (
                              <div key={`workout-set-${setIndex}`} className="grid gap-3 rounded-lg border border-stone-800 bg-[#0B0D0E] p-3 md:grid-cols-[72px_1fr_1fr_1fr_100px_auto] md:items-end">
                                <div className="text-sm font-semibold text-stone-400">Set {setIndex + 1}</div>
                                <label className="block">
                                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">Reps</span>
                                  <input type="number" min="0" value={set.reps} onChange={(event) => updateWorkoutSet(exerciseIndex, setIndex, 'reps', event.target.value)} className="form-field" />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">Weight</span>
                                  <input type="number" min="0" value={set.weight} onChange={(event) => updateWorkoutSet(exerciseIndex, setIndex, 'weight', event.target.value)} className="form-field" />
                                </label>
                                <label className="block">
                                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">Target</span>
                                  <input type="number" min="0" value={set.targetReps} onChange={(event) => updateWorkoutSet(exerciseIndex, setIndex, 'targetReps', event.target.value)} className="form-field" />
                                </label>
                                <label className="flex items-center gap-2 text-sm text-stone-300">
                                  <input
                                    type="checkbox"
                                    checked={set.isPlusSet}
                                    onChange={(event) => updateWorkoutSet(exerciseIndex, setIndex, 'isPlusSet', event.target.checked)}
                                    className="h-4 w-4 rounded border-stone-700 bg-stone-950 accent-[#D4AF37]"
                                  />
                                  Plus
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeWorkoutSet(exerciseIndex, setIndex)}
                                  className="rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/30"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Workout'}
                </button>
              </form>
            </section>
          )}

          {activeSection === 'log-pr' && (
            <section className="quiet-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">{editingPrId ? 'Edit Personal Record' : 'Log Personal Record'}</h2>
                  <p className="section-copy">Manual PR logging uses the existing PR fields and keeps records tied to your account.</p>
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
            </section>
          )}

          {activeSection === 'training-history' && (
            <section className="space-y-5">
              <div>
                <h2 className="section-title">Training History</h2>
                <p className="section-copy">Completed workouts appear here after they are saved from Progress or completed elsewhere.</p>
              </div>

              {completedWorkouts.length === 0 ? (
                <p className="empty-state">Save your first workout to start building training history.</p>
              ) : (
                <div className="divide-y divide-stone-800 border-y border-stone-800">
                  {completedWorkouts.map((workout) => (
                    <article key={workout._id} className="py-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">{formatDate(workout.date)}</p>
                          <h3 className="mt-2 text-xl font-semibold text-stone-50">{workout.title}</h3>
                          <p className="mt-1 text-sm text-stone-500">{Number(workout.totalVolume || 0)} lb total volume</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setWorkoutForm(toWorkoutForm(workout));
                            setEditingWorkoutId(workout._id);
                            setSection('log-workout');
                          }}
                          className="btn-secondary px-3"
                        >
                          View Details
                        </button>
                      </div>
                      <div className="mt-5 space-y-4">
                        {workout.exercises?.map((exercise, exerciseIndex) => (
                          <div key={`${workout._id}-${exercise.exerciseName}-${exerciseIndex}`} className="border-l border-stone-800 pl-4">
                            <h4 className="font-semibold text-stone-100">{exercise.exerciseName}</h4>
                            {exercise.notes && <p className="mt-1 text-sm text-stone-500">{exercise.notes}</p>}
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-400">
                              {exercise.sets?.map((set, setIndex) => (
                                <span key={`${workout._id}-${exerciseIndex}-${setIndex}`}>
                                  {Number(set.weight || 0)} x {Number(set.reps || 0)}
                                  {set.isPlusSet ? ' plus' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'personal-records' && (
            <section className="space-y-6">
              <section className="grid gap-6 md:grid-cols-3">
                <MiniMetric
                  label="Newest Manual PR"
                  value={prSummary.newest?.exerciseName || 'None'}
                  detail={prSummary.newest ? `${getPRValue(prSummary.newest)} lb - ${formatDate(prSummary.newest.date || prSummary.newest.createdAt)}` : 'Log a record manually'}
                />
                <MiniMetric
                  label="Highest Manual PR"
                  value={prSummary.highest ? `${getPRValue(prSummary.highest)} lb` : 'None'}
                  detail={prSummary.highest?.exerciseName || 'No manual records yet'}
                />
                <MiniMetric label="Derived From Workouts" value={derivedWorkoutPrs.length} detail="Best completed workout performances" />
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <div className="quiet-card">
                  <h2 className="section-title">Manual Personal Records</h2>
                  {prs.length === 0 ? (
                    <p className="empty-state mt-5">Log your first personal record to start tracking strength milestones.</p>
                  ) : (
                    <div className="mt-5 divide-y divide-stone-800">
                      {[...prs]
                        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                        .map((pr) => (
                          <article key={pr._id} className="py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold text-stone-50">{pr.exerciseName}</h3>
                                <p className="mt-1 text-sm text-stone-400">
                                  {pr.weight || 0} lb x {pr.reps || 0} - Estimated 1RM {getPRValue(pr)} lb
                                </p>
                                <p className="mt-1 text-sm text-stone-500">{formatDate(pr.date || pr.createdAt)}</p>
                                {pr.notes && <p className="mt-2 text-sm text-stone-500">{pr.notes}</p>}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrForm(toPrForm(pr));
                                    setEditingPrId(pr._id);
                                    setSection('log-pr');
                                  }}
                                  className="btn-secondary px-3"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deletePr(pr._id)}
                                  className="rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/30"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                    </div>
                  )}
                </div>

                <div className="quiet-card">
                  <h2 className="section-title">Derived From Logged Workouts</h2>
                  {derivedWorkoutPrs.length === 0 ? (
                    <p className="empty-state mt-5">Completed workout sets with reps and weight will create calculated PR signals here.</p>
                  ) : (
                    <div className="mt-5 divide-y divide-stone-800">
                      {derivedWorkoutPrs.slice(0, 8).map((record) => (
                        <article key={`${record.exerciseName}-${record.estimatedOneRepMax}`} className="py-4">
                          <h3 className="font-semibold text-stone-50">{record.exerciseName}</h3>
                          <p className="mt-1 text-sm text-stone-400">
                            {record.weight} lb x {record.reps} - Estimated 1RM {record.estimatedOneRepMax} lb
                          </p>
                          <p className="mt-1 text-sm text-stone-500">
                            {record.source} - {formatDate(record.date)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </section>
          )}

          {activeSection === 'strength-progress' && (
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="quiet-card lg:col-span-2">
                <h2 className="section-title">Strength Progress</h2>
                {strengthChartData.length === 0 ? (
                  <p className="empty-state mt-5">Log completed workouts to see volume over time.</p>
                ) : (
                  <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={strengthChartData}>
                        <CartesianGrid stroke="#292524" vertical={false} />
                        <XAxis dataKey="label" stroke="#78716c" tickLine={false} axisLine={false} />
                        <YAxis stroke="#78716c" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#1c1917', border: '1px solid #44403c', color: '#fafaf9' }} />
                        <Line type="monotone" dataKey="volume" name="Total Volume" stroke="#d6c08a" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="quiet-card">
                <h3 className="section-title">Manual PR Trend</h3>
                {prSummary.chartData.length === 0 ? (
                  <p className="empty-state mt-5">Manual PRs will chart here after you log them.</p>
                ) : (
                  <div className="mt-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prSummary.chartData}>
                        <CartesianGrid stroke="#292524" vertical={false} />
                        <XAxis dataKey="label" stroke="#78716c" tickLine={false} axisLine={false} />
                        <YAxis stroke="#78716c" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#1c1917', border: '1px solid #44403c', color: '#fafaf9' }} />
                        <Line type="monotone" dataKey="estimatedOneRepMax" name="Estimated 1RM" stroke="#8FA3AD" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="quiet-card">
                <h3 className="section-title">Recent Performance</h3>
                {derivedWorkoutPrs.length === 0 ? (
                  <p className="empty-state mt-5">Reliable exercise bests appear after completed workouts.</p>
                ) : (
                  <div className="mt-5 divide-y divide-stone-800">
                    {derivedWorkoutPrs.slice(0, 5).map((record) => (
                      <p key={`${record.exerciseName}-summary`} className="py-3 text-sm text-stone-300">
                        {record.exerciseName}: estimated {record.estimatedOneRepMax} lb from {record.weight} x {record.reps}
                      </p>
                    ))}
                  </div>
                )}
              </div>
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
                  <div className="grid gap-4 md:grid-cols-2">
                    {bodyLogs.map((log) => (
                      <article key={log._id} className="quiet-card">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-stone-100">{formatDate(log.date)}</h3>
                            <p className="mt-1 text-sm text-stone-500">
                              {log.bodyWeight || 0} weight - {log.bodyFatPercentage || 0}% body fat
                            </p>
                          </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          {['chest', 'waist', 'hips', 'arms', 'thighs'].map((field) => (
                            <div key={field}>
                              <dt className="capitalize text-stone-500">{field}</dt>
                              <dd className="font-medium text-stone-100">{log.measurements?.[field] || 0}</dd>
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
                            className="rounded-md border border-red-900/60 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/40"
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
