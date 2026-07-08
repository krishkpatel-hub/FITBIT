import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ExerciseCard from '../../components/ExerciseCard/ExerciseCard.jsx';
import WorkoutCard from '../../components/WorkoutCard/WorkoutCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { exerciseService } from '../../services/exerciseService.js';
import { workoutService } from '../../services/workoutService.js';

const today = () => new Date().toISOString().slice(0, 10);

const emptyWorkoutForm = {
  title: '',
  date: today(),
  type: 'strength',
  status: 'planned',
  duration: '',
  notes: '',
  exercises: [],
};

const emptyTemplateForm = {
  name: '',
  muscleGroup: '',
  category: 'strength',
  equipment: '',
  notes: '',
};

const emptyWorkoutExercise = {
  exerciseName: '',
  muscleGroup: '',
  notes: '',
  sets: [],
};

const createSet = (setNumber) => ({
  setNumber,
  reps: '',
  weight: '',
  targetReps: '',
  completed: false,
  isPlusSet: false,
  rpe: '',
});

const numberOrZero = (value) => (value === '' ? 0 : Number(value));

const normalizeWorkoutPayload = (formData) => ({
  ...formData,
  duration: numberOrZero(formData.duration),
  exercises: formData.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({
      ...set,
      reps: numberOrZero(set.reps),
      weight: numberOrZero(set.weight),
      targetReps: numberOrZero(set.targetReps),
      rpe: numberOrZero(set.rpe),
    })),
  })),
});

const calculateLocalVolume = (exercises) =>
  exercises.reduce((workoutTotal, exercise) => {
    const exerciseTotal = exercise.sets.reduce((setTotal, set) => {
      if (!set.completed) {
        return setTotal;
      }

      return setTotal + numberOrZero(set.reps) * numberOrZero(set.weight);
    }, 0);

    return workoutTotal + exerciseTotal;
  }, 0);

const toWorkoutForm = (workout) => ({
  title: workout.title || '',
  date: workout.date ? workout.date.slice(0, 10) : today(),
  type: workout.type || 'strength',
  status: workout.status || 'planned',
  duration: workout.duration ?? '',
  notes: workout.notes || '',
  exercises:
    workout.exercises?.map((exercise) => ({
      exerciseName: exercise.exerciseName || '',
      muscleGroup: exercise.muscleGroup || '',
      notes: exercise.notes || '',
      sets:
        exercise.sets?.map((set) => ({
          setNumber: set.setNumber,
          reps: set.reps ?? '',
          weight: set.weight ?? '',
          targetReps: set.targetReps ?? '',
          completed: Boolean(set.completed),
          isPlusSet: Boolean(set.isPlusSet),
          rpe: set.rpe ?? '',
        })) || [],
    })) || [],
});

function Workout() {
  const { logout } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);
  const [workoutForm, setWorkoutForm] = useState(emptyWorkoutForm);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const localTotalVolume = useMemo(() => calculateLocalVolume(workoutForm.exercises), [workoutForm.exercises]);

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return err.response?.data?.message || fallbackMessage;
  };

  const loadWorkoutData = async () => {
    setLoading(true);
    setError('');

    try {
      const [workoutData, exerciseData] = await Promise.all([
        workoutService.getWorkouts(),
        exerciseService.getExercises(),
      ]);

      setWorkouts(workoutData.data || []);
      setExerciseTemplates(exerciseData.data || []);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load workout data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkoutData();
  }, []);

  const resetWorkoutForm = () => {
    setWorkoutForm({ ...emptyWorkoutForm, date: today(), exercises: [] });
    setEditingWorkoutId(null);
  };

  const handleWorkoutFieldChange = (event) => {
    const { name, value } = event.target;
    setWorkoutForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleTemplateFieldChange = (event) => {
    const { name, value } = event.target;
    setTemplateForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const addExerciseToWorkout = () => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          ...emptyWorkoutExercise,
          sets: [createSet(1)],
        },
      ],
    }));
  };

  const removeExerciseFromWorkout = (exerciseIndex) => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.filter((_, index) => index !== exerciseIndex),
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

  const applyTemplateToExercise = (exerciseIndex, templateId) => {
    const template = exerciseTemplates.find((exercise) => exercise._id === templateId);

    if (!template) {
      return;
    }

    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              exerciseName: template.name,
              muscleGroup: template.muscleGroup,
              notes: exercise.notes || template.notes || '',
            }
          : exercise,
      ),
    }));
  };

  const addSetToExercise = (exerciseIndex) => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: [...exercise.sets, createSet(exercise.sets.length + 1)],
            }
          : exercise,
      ),
    }));
  };

  const removeSetFromExercise = (exerciseIndex, setIndex) => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) => {
        if (index !== exerciseIndex) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets
            .filter((_, currentSetIndex) => currentSetIndex !== setIndex)
            .map((set, currentSetIndex) => ({ ...set, setNumber: currentSetIndex + 1 })),
        };
      }),
    }));
  };

  const updateExerciseSet = (exerciseIndex, setIndex, field, value) => {
    setWorkoutForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) => {
        if (index !== exerciseIndex) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set, currentSetIndex) =>
            currentSetIndex === setIndex ? { ...set, [field]: value } : set,
          ),
        };
      }),
    }));
  };

  const handleWorkoutSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingWorkout(true);

    try {
      const payload = normalizeWorkoutPayload(workoutForm);
      const response = editingWorkoutId
        ? await workoutService.updateWorkout(editingWorkoutId, payload)
        : await workoutService.createWorkout(payload);

      if (editingWorkoutId) {
        setWorkouts((current) => current.map((workout) => (workout._id === editingWorkoutId ? response.data : workout)));
        setSuccess('Workout updated successfully.');
      } else {
        setWorkouts((current) => [response.data, ...current]);
        setSuccess('Workout created successfully.');
      }

      resetWorkoutForm();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save workout.'));
    } finally {
      setSavingWorkout(false);
    }
  };

  const handleEditWorkout = (workout) => {
    setEditingWorkoutId(workout._id);
    setWorkoutForm(toWorkoutForm(workout));
    setSuccess('');
    setError('');
  };

  const handleDeleteWorkout = async (workoutId) => {
    if (!window.confirm('Delete this workout?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await workoutService.deleteWorkout(workoutId);
      setWorkouts((current) => current.filter((workout) => workout._id !== workoutId));
      if (editingWorkoutId === workoutId) {
        resetWorkoutForm();
      }
      setSuccess('Workout deleted successfully.');
    } catch (err) {
      setError(await handleApiError(err, 'Unable to delete workout.'));
    }
  };

  const handleTemplateSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingTemplate(true);

    try {
      const response = await exerciseService.createExercise({
        ...templateForm,
        isTemplate: true,
      });

      setExerciseTemplates((current) => [response.data, ...current]);
      setTemplateForm(emptyTemplateForm);
      setSuccess('Exercise template created successfully.');
    } catch (err) {
      setError(await handleApiError(err, 'Unable to create exercise template.'));
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Workout</h1>
        <p className="mt-2 text-slate-400">Create workouts, add exercises, and track completed set volume.</p>
        <Link to="/strength-program" className="mt-3 inline-block text-sm font-medium text-emerald-300 hover:text-emerald-200">
          Set up your adaptive strength program
        </Link>
      </div>

      {error && <p className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      {success && <p className="rounded-md bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">{success}</p>}

      <form onSubmit={handleWorkoutSubmit} className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              {editingWorkoutId ? 'Edit Workout' : 'Create Workout'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">Current form volume: {localTotalVolume}</p>
          </div>
          {editingWorkoutId && (
            <button
              type="button"
              onClick={resetWorkoutForm}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Title</span>
            <input
              type="text"
              name="title"
              value={workoutForm.title}
              onChange={handleWorkoutFieldChange}
              required
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Date</span>
            <input
              type="date"
              name="date"
              value={workoutForm.date}
              onChange={handleWorkoutFieldChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Type</span>
            <input
              type="text"
              name="type"
              value={workoutForm.type}
              onChange={handleWorkoutFieldChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Status</span>
            <select
              name="status"
              value={workoutForm.status}
              onChange={handleWorkoutFieldChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Duration minutes</span>
            <input
              type="number"
              name="duration"
              min="0"
              value={workoutForm.duration}
              onChange={handleWorkoutFieldChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-300">Notes</span>
            <textarea
              name="notes"
              value={workoutForm.notes}
              onChange={handleWorkoutFieldChange}
              rows="3"
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-50">Workout Exercises</h3>
            <button
              type="button"
              onClick={addExerciseToWorkout}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
            >
              Add Exercise
            </button>
          </div>

          {workoutForm.exercises.length === 0 ? (
            <p className="rounded-md bg-slate-800/60 px-3 py-4 text-sm text-slate-400">
              No exercises added yet.
            </p>
          ) : (
            workoutForm.exercises.map((exercise, exerciseIndex) => (
              <div key={`exercise-${exerciseIndex}`} className="rounded-lg border border-slate-800 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Use template</span>
                    <select
                      value=""
                      onChange={(event) => applyTemplateToExercise(exerciseIndex, event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select template</option>
                      {exerciseTemplates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.name} ({template.muscleGroup})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Exercise name</span>
                    <input
                      type="text"
                      value={exercise.exerciseName}
                      onChange={(event) => updateWorkoutExercise(exerciseIndex, 'exerciseName', event.target.value)}
                      required
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Muscle group</span>
                    <input
                      type="text"
                      value={exercise.muscleGroup}
                      onChange={(event) => updateWorkoutExercise(exerciseIndex, 'muscleGroup', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Exercise notes</span>
                    <input
                      type="text"
                      value={exercise.notes}
                      onChange={(event) => updateWorkoutExercise(exerciseIndex, 'notes', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-100">Sets</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addSetToExercise(exerciseIndex)}
                        className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
                      >
                        Add Set
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExerciseFromWorkout(exerciseIndex)}
                        className="rounded-md border border-red-900/60 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/40"
                      >
                        Remove Exercise
                      </button>
                    </div>
                  </div>

                  {exercise.sets.map((set, setIndex) => (
                    <div key={`set-${set.setNumber}`} className="grid gap-3 rounded-md bg-slate-800/60 p-3 md:grid-cols-7">
                      <div className="text-sm font-medium text-slate-300">Set {set.setNumber}</div>
                      <label className="block">
                        <span className="text-xs text-slate-500">Reps</span>
                        <input
                          type="number"
                          min="0"
                          value={set.reps}
                          onChange={(event) => updateExerciseSet(exerciseIndex, setIndex, 'reps', event.target.value)}
                          className="mt-1 w-full rounded-md border border-slate-700 px-2 py-1"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-500">Weight</span>
                        <input
                          type="number"
                          min="0"
                          value={set.weight}
                          onChange={(event) => updateExerciseSet(exerciseIndex, setIndex, 'weight', event.target.value)}
                          className="mt-1 w-full rounded-md border border-slate-700 px-2 py-1"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-500">Target reps</span>
                        <input
                          type="number"
                          min="0"
                          value={set.targetReps}
                          onChange={(event) =>
                            updateExerciseSet(exerciseIndex, setIndex, 'targetReps', event.target.value)
                          }
                          className="mt-1 w-full rounded-md border border-slate-700 px-2 py-1"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-500">RPE</span>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={set.rpe}
                          onChange={(event) => updateExerciseSet(exerciseIndex, setIndex, 'rpe', event.target.value)}
                          className="mt-1 w-full rounded-md border border-slate-700 px-2 py-1"
                        />
                      </label>
                      <div className="flex items-center gap-3 text-sm text-slate-300">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={set.completed}
                            onChange={(event) =>
                              updateExerciseSet(exerciseIndex, setIndex, 'completed', event.target.checked)
                            }
                          />
                          Done
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={set.isPlusSet}
                            onChange={(event) =>
                              updateExerciseSet(exerciseIndex, setIndex, 'isPlusSet', event.target.checked)
                            }
                          />
                          Plus
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSetFromExercise(exerciseIndex, setIndex)}
                        className="rounded-md border border-red-900/60 px-2 py-1 text-sm font-medium text-red-300 hover:bg-red-950/40"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="submit"
          disabled={savingWorkout}
          className="mt-6 rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900"
        >
          {savingWorkout ? 'Saving...' : editingWorkoutId ? 'Update Workout' : 'Create Workout'}
        </button>
      </form>

      <form onSubmit={handleTemplateSubmit} className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-xl font-semibold text-slate-50">Exercise Templates</h2>
        <p className="mt-1 text-sm text-slate-400">Create reusable exercise options for workout entries.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Name</span>
            <input
              type="text"
              name="name"
              value={templateForm.name}
              onChange={handleTemplateFieldChange}
              required
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Muscle group</span>
            <input
              type="text"
              name="muscleGroup"
              value={templateForm.muscleGroup}
              onChange={handleTemplateFieldChange}
              required
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Category</span>
            <select
              name="category"
              value={templateForm.category}
              onChange={handleTemplateFieldChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="mobility">Mobility</option>
              <option value="accessory">Accessory</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Equipment</span>
            <input
              type="text"
              name="equipment"
              value={templateForm.equipment}
              onChange={handleTemplateFieldChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-300">Notes</span>
            <textarea
              name="notes"
              value={templateForm.notes}
              onChange={handleTemplateFieldChange}
              rows="2"
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={savingTemplate}
          className="mt-6 rounded-md bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {savingTemplate ? 'Saving...' : 'Create Template'}
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">Your Workouts</h2>
          {loading ? (
            <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">Loading workouts...</p>
          ) : workouts.length === 0 ? (
            <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
              No workouts yet. Create your first workout above.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {workouts.map((workout) => (
                <WorkoutCard
                  key={workout._id}
                  workout={workout}
                  onEdit={handleEditWorkout}
                  onDelete={handleDeleteWorkout}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">Templates</h2>
          {exerciseTemplates.length === 0 ? (
            <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
              No exercise templates yet.
            </p>
          ) : (
            <div className="space-y-3">
              {exerciseTemplates.map((exercise) => (
                <ExerciseCard key={exercise._id} exercise={exercise} />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default Workout;
