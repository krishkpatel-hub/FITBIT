import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { templateService } from '../../services/templateService';

const WORKOUT_DRAFT_STORAGE_KEY = 'getjackedcoach.workoutDraft';

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
};

const starterTemplates = [
  {
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps hypertrophy workout.',
    category: 'bodybuilding',
    exercises: [
      { exerciseName: 'Bench Press', muscleGroup: 'Chest', notes: '' },
      { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'Chest', notes: '' },
      { exerciseName: 'Cable Fly', muscleGroup: 'Chest', notes: '' },
      { exerciseName: 'Overhead Press', muscleGroup: 'Shoulders', notes: '' },
      { exerciseName: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', notes: '' },
      { exerciseName: 'Tricep Pushdown', muscleGroup: 'Triceps', notes: '' },
      { exerciseName: 'Overhead Rope Tricep Extension', muscleGroup: 'Triceps', notes: '' },
    ],
  },
  {
    name: 'Pull Day',
    description: 'Back, rear delts, traps, and biceps.',
    category: 'bodybuilding',
    exercises: [
      { exerciseName: 'Lat Pulldown', muscleGroup: 'Back', notes: '' },
      { exerciseName: 'Chest Supported Row', muscleGroup: 'Back', notes: '' },
      { exerciseName: 'Seated Cable Row', muscleGroup: 'Back', notes: '' },
      { exerciseName: 'Face Pull', muscleGroup: 'Rear Delts', notes: '' },
      { exerciseName: 'Reverse Pec Deck', muscleGroup: 'Rear Delts', notes: '' },
      { exerciseName: 'Dumbbell Shrugs', muscleGroup: 'Traps', notes: '' },
      { exerciseName: 'EZ Bar Curl', muscleGroup: 'Biceps', notes: '' },
      { exerciseName: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', notes: '' },
    ],
  },
  {
    name: 'Leg Day',
    description: 'Quads, hamstrings, glutes, and calves.',
    category: 'bodybuilding',
    exercises: [
      { exerciseName: 'Back Squat', muscleGroup: 'Quads', notes: '' },
      { exerciseName: 'Leg Press', muscleGroup: 'Quads', notes: '' },
      { exerciseName: 'Leg Extension', muscleGroup: 'Quads', notes: '' },
      { exerciseName: 'Romanian Deadlift', muscleGroup: 'Hamstrings', notes: '' },
      { exerciseName: 'Seated Leg Curl', muscleGroup: 'Hamstrings', notes: '' },
      { exerciseName: 'Walking Lunges', muscleGroup: 'Glutes', notes: '' },
      { exerciseName: 'Standing Calf Raise', muscleGroup: 'Calves', notes: '' },
      { exerciseName: 'Seated Calf Raise', muscleGroup: 'Calves', notes: '' },
    ],
  },
  {
    name: 'Upper Body',
    description: 'Balanced upper body strength and hypertrophy.',
    category: 'strength',
    exercises: [
      { exerciseName: 'Bench Press', muscleGroup: 'Chest', notes: '' },
      { exerciseName: 'Incline Dumbbell Press', muscleGroup: 'Chest', notes: '' },
      { exerciseName: 'Pull Ups', muscleGroup: 'Back', notes: '' },
      { exerciseName: 'Barbell Row', muscleGroup: 'Back', notes: '' },
      { exerciseName: 'Overhead Press', muscleGroup: 'Shoulders', notes: '' },
      { exerciseName: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders', notes: '' },
      { exerciseName: 'Tricep Pushdown', muscleGroup: 'Triceps', notes: '' },
      { exerciseName: 'Dumbbell Curl', muscleGroup: 'Biceps', notes: '' },
    ],
  },
  {
    name: 'Lower Body',
    description: 'Complete lower body training.',
    category: 'bodybuilding',
    exercises: [
      { exerciseName: 'Back Squat', muscleGroup: 'Quads', notes: '' },
      { exerciseName: 'Romanian Deadlift', muscleGroup: 'Hamstrings', notes: '' },
      { exerciseName: 'Leg Press', muscleGroup: 'Quads', notes: '' },
      { exerciseName: 'Leg Extension', muscleGroup: 'Quads', notes: '' },
      { exerciseName: 'Hamstring Curl', muscleGroup: 'Hamstrings', notes: '' },
      { exerciseName: 'Bulgarian Split Squat', muscleGroup: 'Glutes', notes: '' },
      { exerciseName: 'Standing Calf Raise', muscleGroup: 'Calves', notes: '' },
      { exerciseName: 'Seated Calf Raise', muscleGroup: 'Calves', notes: '' },
    ],
  },
];

const normalizeTemplatePayload = (template) => ({
  ...template,
  name: template.name.trim(),
  description: template.description || '',
  exercises: template.exercises
    .filter((exercise) => exercise.exerciseName.trim())
    .map((exercise) => ({
      exerciseName: exercise.exerciseName.trim(),
      muscleGroup: exercise.muscleGroup || '',
      notes: exercise.notes || '',
      sets: [],
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
    })) || [],
});

const createWorkoutDraft = (template) => ({
  source: 'template',
  templateName: template.name,
  title: template.name,
  date: new Date().toISOString().slice(0, 10),
  type: template.category || 'strength',
  duration: '',
  notes: template.description || '',
  exercises: (template.exercises || []).map((exercise) => ({
    exerciseName: exercise.exerciseName,
    muscleGroup: exercise.muscleGroup || '',
    notes: exercise.notes || '',
    sets: [],
  })),
});

function Templates() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState(emptyTemplate);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
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

  const resetForm = () => {
    setFormData({ ...emptyTemplate, exercises: [] });
    setEditingId(null);
  };

  const validateTemplate = () => {
    if (!formData.name.trim()) {
      return 'Template name is required.';
    }

    if (!formData.exercises.some((exercise) => exercise.exerciseName.trim())) {
      return 'Add at least one exercise before finalizing a template.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateTemplate();

    if (validationError) {
      setError(validationError);
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

  const finalizeTemplate = async () => {
    setError('');
    setSuccess('');

    const validationError = validateTemplate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setFinalizing(true);

    try {
      const payload = normalizeTemplatePayload(formData);
      const response = editingId
        ? await templateService.updateTemplate(editingId, payload)
        : await templateService.createTemplate(payload);
      const finalizedTemplate = response.data || payload;
      const workoutDraft = createWorkoutDraft(finalizedTemplate);

      window.sessionStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(workoutDraft));
      navigate('/progress?section=log-workout', {
        state: { workoutDraft },
      });
    } catch (err) {
      setError(await handleApiError(err, 'Unable to finalize template.'));
    } finally {
      setFinalizing(false);
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

  const startSavedTemplate = (template) => {
    const workoutDraft = createWorkoutDraft(toTemplateForm(template));
    window.sessionStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(workoutDraft));
    navigate('/progress?section=log-workout', {
      state: { workoutDraft },
    });
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
        <p className="page-copy">Choose exercises, finalize a template, then log today's sets inside Progress.</p>
      </header>

      {error && <p className="status-error">{error}</p>}
      {success && <p className="status-success">{success}</p>}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSubmit} className="quiet-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">{editingId ? 'Edit Template' : 'Create Template'}</h2>
              <p className="section-copy">Templates only define the exercise list. Sets, reps, and weight are logged during the workout.</p>
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
                <article key={`exercise-${exerciseIndex}`} className="border-t border-stone-800 pt-5">
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

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeExercise(exerciseIndex)}
                        className="btn-danger"
                      >
                        Remove Exercise
                      </button>
                    </div>
                  </details>
                </article>
              ))
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={finalizing || saving} onClick={finalizeTemplate} className="btn-primary">
              {finalizing ? 'Finalizing...' : 'Finalize Template'}
            </button>
            <button type="submit" disabled={saving || finalizing} className="btn-secondary">
              {saving ? 'Saving...' : editingId ? 'Save Template' : 'Save Without Logging'}
            </button>
          </div>
        </form>

        <section className="space-y-6">
          <section className="quiet-card">
            <h2 className="section-title">Starter Templates</h2>
            <p className="section-copy">Use one as a starting point, customize the exercise list, then finalize it.</p>
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
                        <button type="button" onClick={() => startSavedTemplate(template)} className="btn-primary px-3">
                          Log Workout
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(template._id)}
                          className="btn-danger"
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

    </motion.section>
  );
}

export default Templates;
