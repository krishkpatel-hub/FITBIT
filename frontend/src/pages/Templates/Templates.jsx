import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { templateService } from '../../services/templateService.js';

const today = () => new Date().toISOString().slice(0, 10);

const emptyTemplate = {
  name: '',
  description: '',
  category: 'strength',
  exercises: [],
};

const emptyExercise = {
  exerciseName: '',
  muscleGroup: '',
  notes: '',
  sets: [],
};

const starterTemplates = [
  {
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps hypertrophy workout.',
    category: 'bodybuilding',
    exercises: [
      { exerciseName: 'Bench Press', muscleGroup: 'Chest', notes: '', sets: [] },
      { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'Chest', notes: '', sets: [] },
      { exerciseName: 'Cable Fly', muscleGroup: 'Chest', notes: '', sets: [] },
      { exerciseName: 'Overhead Press', muscleGroup: 'Shoulders', notes: '', sets: [] },
      { exerciseName: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', notes: '', sets: [] },
      { exerciseName: 'Tricep Pushdown', muscleGroup: 'Triceps', notes: '', sets: [] },
      { exerciseName: 'Overhead Rope Tricep Extension', muscleGroup: 'Triceps', notes: '', sets: [] },
    ],
  },
  {
    name: 'Pull Day',
    description: 'Back, rear delts, traps, and biceps.',
    category: 'bodybuilding',
    exercises: [
      { exerciseName: 'Lat Pulldown', muscleGroup: 'Back', notes: '', sets: [] },
      { exerciseName: 'Chest Supported Row', muscleGroup: 'Back', notes: '', sets: [] },
      { exerciseName: 'Seated Cable Row', muscleGroup: 'Back', notes: '', sets: [] },
      { exerciseName: 'Face Pull', muscleGroup: 'Rear Delts', notes: '', sets: [] },
      { exerciseName: 'Reverse Pec Deck', muscleGroup: 'Rear Delts', notes: '', sets: [] },
      { exerciseName: 'Dumbbell Shrugs', muscleGroup: 'Traps', notes: '', sets: [] },
      { exerciseName: 'EZ Bar Curl', muscleGroup: 'Biceps', notes: '', sets: [] },
      { exerciseName: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', notes: '', sets: [] },
    ],
  },
  {
    name: 'Leg Day',
    description: 'Quads, hamstrings, glutes, and calves.',
    category: 'bodybuilding',
    exercises: [
      { exerciseName: 'Back Squat', muscleGroup: 'Quads', notes: '', sets: [] },
      { exerciseName: 'Leg Press', muscleGroup: 'Quads', notes: '', sets: [] },
      { exerciseName: 'Leg Extension', muscleGroup: 'Quads', notes: '', sets: [] },
      { exerciseName: 'Romanian Deadlift', muscleGroup: 'Hamstrings', notes: '', sets: [] },
      { exerciseName: 'Seated Leg Curl', muscleGroup: 'Hamstrings', notes: '', sets: [] },
      { exerciseName: 'Walking Lunges', muscleGroup: 'Glutes', notes: '', sets: [] },
      { exerciseName: 'Standing Calf Raise', muscleGroup: 'Calves', notes: '', sets: [] },
      { exerciseName: 'Seated Calf Raise', muscleGroup: 'Calves', notes: '', sets: [] },
    ],
  },
  {
    name: 'Upper Body',
    description: 'Balanced upper body strength and hypertrophy.',
    category: 'strength',
    exercises: [
      { exerciseName: 'Bench Press', muscleGroup: 'Chest', notes: '', sets: [] },
      { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'Chest', notes: '', sets: [] },
      { exerciseName: 'Pull Ups', muscleGroup: 'Back', notes: '', sets: [] },
      { exerciseName: 'Barbell Row', muscleGroup: 'Back', notes: '', sets: [] },
      { exerciseName: 'Overhead Press', muscleGroup: 'Shoulders', notes: '', sets: [] },
      { exerciseName: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', notes: '', sets: [] },
      { exerciseName: 'Tricep Pushdown', muscleGroup: 'Triceps', notes: '', sets: [] },
      { exerciseName: 'Dumbbell Curl', muscleGroup: 'Biceps', notes: '', sets: [] },
    ],
  },
  {
    name: 'Lower Body',
    description: 'Complete lower body training.',
    category: 'bodybuilding',
    exercises: [
      { exerciseName: 'Back Squat', muscleGroup: 'Quads', notes: '', sets: [] },
      { exerciseName: 'Romanian Deadlift', muscleGroup: 'Hamstrings', notes: '', sets: [] },
      { exerciseName: 'Leg Press', muscleGroup: 'Quads', notes: '', sets: [] },
      { exerciseName: 'Leg Extension', muscleGroup: 'Quads', notes: '', sets: [] },
      { exerciseName: 'Hamstring Curl', muscleGroup: 'Hamstrings', notes: '', sets: [] },
      { exerciseName: 'Bulgarian Split Squat', muscleGroup: 'Glutes', notes: '', sets: [] },
      { exerciseName: 'Standing Calf Raise', muscleGroup: 'Calves', notes: '', sets: [] },
      { exerciseName: 'Seated Calf Raise', muscleGroup: 'Calves', notes: '', sets: [] },
    ],
  },
];

const createSet = (setNumber) => ({
  setNumber,
  targetReps: '',
  weight: '',
  isPlusSet: false,
});

const numberOrZero = (value) => (value === '' ? 0 : Number(value));

const normalizeTemplatePayload = (template) => ({
  ...template,
  exercises: template.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set, index) => ({
      setNumber: Number(set.setNumber || index + 1),
      targetReps: numberOrZero(set.targetReps),
      weight: numberOrZero(set.weight),
      isPlusSet: Boolean(set.isPlusSet),
    })),
  })),
});

const toTemplateForm = (template) => ({
  name: template.name || '',
  description: template.description || '',
  category: template.category || 'strength',
  exercises:
    template.exercises?.map((exercise) => ({
      exerciseName: exercise.exerciseName || '',
      muscleGroup: exercise.muscleGroup || '',
      notes: exercise.notes || '',
      sets:
        exercise.sets?.map((set) => ({
          setNumber: set.setNumber,
          targetReps: set.targetReps ?? '',
          weight: set.weight ?? '',
          isPlusSet: Boolean(set.isPlusSet),
        })) || [],
    })) || [],
});

function Templates() {
  const { logout } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState(emptyTemplate);
  const [editingId, setEditingId] = useState(null);
  const [startTarget, setStartTarget] = useState(null);
  const [plannedDate, setPlannedDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userTemplates = useMemo(() => templates.filter((template) => !template.isDefault), [templates]);

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return err.response?.data?.message || fallbackMessage;
  };

  const loadTemplates = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await templateService.getTemplates();
      setTemplates(response.data || []);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load templates.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addExercise = () => {
    setFormData((current) => ({
      ...current,
      exercises: [...current.exercises, { ...emptyExercise }],
    }));
  };

  const updateExercise = (exerciseIndex, field, value) => {
    setFormData((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, [field]: value } : exercise,
      ),
    }));
  };

  const removeExercise = (exerciseIndex) => {
    setFormData((current) => ({
      ...current,
      exercises: current.exercises.filter((_, index) => index !== exerciseIndex),
    }));
  };

  const addSet = (exerciseIndex) => {
    setFormData((current) => ({
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

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    setFormData((current) => ({
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

  const removeSet = (exerciseIndex, setIndex) => {
    setFormData((current) => ({
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

  const resetForm = () => {
    setFormData({ ...emptyTemplate, exercises: [] });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Template name is required.');
      return;
    }

    setSaving(true);

    try {
      const payload = normalizeTemplatePayload(formData);

      if (editingId) {
        await templateService.updateTemplate(editingId, payload);
        setSuccess('Template updated.');
      } else {
        await templateService.createTemplate(payload);
        setSuccess('Template created.');
      }

      resetForm();
      await loadTemplates();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save template.'));
    } finally {
      setSaving(false);
    }
  };

  const editTemplate = (template) => {
    if (template.isDefault) {
      setFormData(toTemplateForm({ ...template, name: `${template.name} Copy` }));
      setEditingId(null);
    } else {
      setFormData(toTemplateForm(template));
      setEditingId(template._id);
    }
    setError('');
    setSuccess('');
  };

  const deleteTemplate = async (templateId) => {
    setError('');
    setSuccess('');

    try {
      await templateService.deleteTemplate(templateId);
      setSuccess('Template deleted.');
      if (editingId === templateId) {
        resetForm();
      }
      await loadTemplates();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to delete template.'));
    }
  };

  const startWorkout = async (event) => {
    event.preventDefault();

    if (!startTarget) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await templateService.startWorkoutFromTemplate(startTarget._id, plannedDate);
      setSuccess(`Planned workout created from ${startTarget.name}.`);
      setStartTarget(null);
      setPlannedDate(today());
    } catch (err) {
      setError(await handleApiError(err, 'Unable to start workout from template.'));
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
        <p className="eyebrow">Reusable Training</p>
        <h1 className="page-title">Workout Templates</h1>
        <p className="page-copy">Build repeatable routines and turn them into planned workouts with one date.</p>
      </header>

      {error && <p className="status-error">{error}</p>}
      {success && <p className="status-success">{success}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSubmit} className="quiet-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">{editingId ? 'Edit Template' : 'Create Template'}</h2>
              <p className="section-copy">Add reusable exercises first. Sets stay empty until you add them manually.</p>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-secondary px-3">
                Cancel
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-stone-300">Name</span>
              <input value={formData.name} onChange={(event) => updateField('name', event.target.value)} className="form-field" required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-300">Category</span>
              <select value={formData.category} onChange={(event) => updateField('category', event.target.value)} className="form-field">
                <option value="strength">Strength</option>
                <option value="bodybuilding">Bodybuilding</option>
                <option value="powerlifting">Powerlifting</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-stone-300">Description</span>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(event) => updateField('description', event.target.value)}
                className="form-field"
              />
            </label>
          </div>

          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-stone-50">Exercises</h3>
              <button type="button" onClick={addExercise} className="btn-secondary px-3">
                Add Exercise
              </button>
            </div>

            {formData.exercises.length === 0 ? (
              <p className="empty-state">Add exercises to make this template useful.</p>
            ) : (
              formData.exercises.map((exercise, exerciseIndex) => (
                <article key={`exercise-${exerciseIndex}`} className="rounded-xl border border-stone-800 bg-stone-950/35 p-4 sm:p-5">
                  <details open className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Exercise {exerciseIndex + 1}</p>
                        <h4 className="mt-1 text-lg font-semibold text-stone-50">{exercise.exerciseName || 'Untitled Exercise'}</h4>
                        <p className="mt-1 text-sm text-stone-500">{exercise.muscleGroup || 'Muscle group not set'}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37] group-open:hidden">Open</span>
                      <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 group-open:inline">Close</span>
                    </summary>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-stone-300">Exercise name</span>
                        <input
                          value={exercise.exerciseName}
                          onChange={(event) => updateExercise(exerciseIndex, 'exerciseName', event.target.value)}
                          className="form-field"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-stone-300">Muscle group</span>
                        <input
                          value={exercise.muscleGroup}
                          onChange={(event) => updateExercise(exerciseIndex, 'muscleGroup', event.target.value)}
                          className="form-field"
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="text-sm font-medium text-stone-300">Notes</span>
                        <textarea
                          rows="2"
                          value={exercise.notes}
                          onChange={(event) => updateExercise(exerciseIndex, 'notes', event.target.value)}
                          className="form-field"
                          placeholder="Optional cues, setup notes, or machine preference"
                        />
                      </label>
                    </div>

                    <div className="mt-5 border-t border-stone-800 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-stone-200">Sets</p>
                          <p className="mt-1 text-xs text-stone-500">Add sets only when this template needs them.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => addSet(exerciseIndex)} className="btn-secondary px-3">
                            Add Set
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExercise(exerciseIndex)}
                            className="rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/30"
                          >
                            Remove Exercise
                          </button>
                        </div>
                      </div>

                      {exercise.sets.length === 0 ? (
                        <p className="mt-4 rounded-lg border border-dashed border-stone-800 px-4 py-3 text-sm text-stone-500">
                          No sets yet. Use Add Set when you want this exercise to include a reusable set.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {exercise.sets.map((set, setIndex) => (
                            <div
                              key={`set-${setIndex}`}
                              className="grid gap-3 rounded-lg border border-stone-800 bg-[#0B0D0E] p-3 md:grid-cols-[72px_1fr_1fr_120px_auto] md:items-end"
                            >
                              <div className="text-sm font-semibold text-stone-400">Set {set.setNumber}</div>
                              <label className="block">
                                <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">Reps</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={set.targetReps}
                                  onChange={(event) => updateSet(exerciseIndex, setIndex, 'targetReps', event.target.value)}
                                  className="form-field"
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">Weight</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={set.weight}
                                  onChange={(event) => updateSet(exerciseIndex, setIndex, 'weight', event.target.value)}
                                  className="form-field"
                                />
                              </label>
                              <label className="flex items-center gap-2 text-sm text-stone-300">
                                <input
                                  type="checkbox"
                                  checked={set.isPlusSet}
                                  onChange={(event) => updateSet(exerciseIndex, setIndex, 'isPlusSet', event.target.checked)}
                                  className="h-4 w-4 rounded border-stone-700 bg-stone-950 accent-[#D4AF37]"
                                />
                                Plus Set
                              </label>
                              <button
                                type="button"
                                onClick={() => removeSet(exerciseIndex, setIndex)}
                                className="rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/30"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                </article>
              ))
            )}
          </div>

          <button type="submit" disabled={saving} className="btn-primary mt-6">
            {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
          </button>
        </form>

        <section className="space-y-6">
          <section className="quiet-card">
            <h2 className="section-title">Starter Templates</h2>
            <p className="section-copy">Use one as a starting point, then save it as your own editable template.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {starterTemplates.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => {
                    setFormData(toTemplateForm(template));
                    setEditingId(null);
                  }}
                  className="border-t border-stone-800 pt-4 text-left transition-colors hover:text-stone-50"
                >
                  <span className="block font-semibold text-stone-100">{template.name}</span>
                  <span className="mt-1 block text-sm text-stone-500">{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="quiet-card">
            <h2 className="section-title">Your Templates</h2>
            {loading ? (
              <p className="empty-state mt-5">Loading templates...</p>
            ) : userTemplates.length === 0 ? (
              <p className="empty-state mt-5">Create a reusable workout template to plan training faster.</p>
            ) : (
              <div className="mt-5 divide-y divide-stone-800">
                {userTemplates.map((template) => (
                  <article key={template._id} className="py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-stone-50">{template.name}</h3>
                        <p className="mt-1 text-sm capitalize text-stone-500">
                          {template.category} · {template.exercises?.length || 0} exercises
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => editTemplate(template)} className="btn-secondary px-3">
                          Edit
                        </button>
                        <button type="button" onClick={() => setStartTarget(template)} className="btn-primary px-3">
                          Start
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(template._id)}
                          className="rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {template.description && <p className="mt-3 text-sm leading-6 text-stone-400">{template.description}</p>}
                    <div className="mt-3 text-sm text-stone-400">
                      {template.exercises?.map((exercise) => exercise.exerciseName).join(', ')}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </section>

      {startTarget && (
        <section className="quiet-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Start Workout</h2>
              <p className="section-copy">Create a planned workout from “{startTarget.name}”.</p>
            </div>
            <button type="button" onClick={() => setStartTarget(null)} className="btn-secondary px-3">
              Cancel
            </button>
          </div>
          <form onSubmit={startWorkout} className="mt-5 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm font-medium text-stone-300">Planned date</span>
              <input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} className="form-field" required />
            </label>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating...' : 'Create Planned Workout'}
            </button>
          </form>
        </section>
      )}
    </motion.section>
  );
}

export default Templates;
