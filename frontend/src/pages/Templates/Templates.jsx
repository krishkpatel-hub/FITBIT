import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { templateService } from '../../services/templateService';
import { appPaths } from '../../utils/navigation';
import {
  createWorkoutDraft, emptyExercise, emptyTemplate, normalizeTemplatePayload,
  starterTemplates, toTemplateForm, WORKOUT_DRAFT_STORAGE_KEY,
} from '../../utils/templateWorkflow';

const stepNames = ['Template details', 'Exercises', 'Review'];

function Templates() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState(emptyTemplate);
  const [editingId, setEditingId] = useState(null);
  const [step, setStep] = useState(0);
  const [editingExercise, setEditingExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pendingRef = useRef(false);
  const headingRef = useRef(null);
  const startersRef = useRef(null);

  const handleApiError = async (err, fallback) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }
    return err.response?.data?.message || fallback;
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await templateService.getTemplates();
      setTemplates(response.data || []);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load templates. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, []);
  useEffect(() => { if (step > 0) headingRef.current?.focus(); }, [step]);

  const chooseTemplate = (template, id = null) => {
    setFormData(toTemplateForm(template));
    setEditingId(id);
    setEditingExercise(null);
    setStep(1);
    setError('');
    setSuccess('');
  };

  const updateField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));
  const updateExercise = (index, field, value) => setFormData((current) => ({
    ...current,
    exercises: current.exercises.map((exercise, i) => i === index ? { ...exercise, [field]: value } : exercise),
  }));

  const validate = () => {
    if (!formData.name.trim()) return 'Give your template a name.';
    if (step >= 2 && formData.exercises.length === 0) return 'Add at least one exercise before reviewing your template.';
    if (step >= 2 && formData.exercises.some((exercise) => !exercise.exerciseName.trim())) return 'Enter a name for each exercise, or remove the empty row.';
    return '';
  };

  const nextStep = () => {
    const message = validate();
    setError(message);
    if (!message) {
      setEditingExercise(null);
      setStep((current) => current + 1);
    }
  };

  const startWorkout = (template) => {
    const workoutDraft = createWorkoutDraft(template);
    // Navigation state works even when the browser disallows session storage.
    try { window.sessionStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(workoutDraft)); } catch { /* Optional recovery copy. */ }
    navigate(appPaths.train, { state: { workoutDraft } });
  };

  const saveTemplate = async (startAfterSaving = false) => {
    if (pendingRef.current) return;
    const message = validate();
    setError(message);
    setSuccess('');
    if (message) return;
    pendingRef.current = true;
    setSaving(true);
    try {
      const payload = normalizeTemplatePayload(formData);
      const response = editingId
        ? await templateService.updateTemplate(editingId, payload)
        : await templateService.createTemplate(payload);
      if (startAfterSaving) {
        startWorkout(response.data || payload);
      } else {
        setSuccess(editingId ? 'Template updated.' : 'Template saved. Start a workout whenever you are ready.');
        setStep(0);
        setEditingId(null);
        await loadTemplates();
      }
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save template. Your changes are still here.'));
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
  };

  const deleteTemplate = async (template) => {
    if (pendingRef.current || !window.confirm(`Delete "${template.name}"? Completed workouts will not be changed.`)) return;
    pendingRef.current = true;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await templateService.deleteTemplate(template._id);
      setSuccess('Template deleted. Your workout history is unchanged.');
      await loadTemplates();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to delete template.'));
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
  };

  const userTemplates = templates.filter((template) => !template.isDefault);
  const suppliedDefaults = templates.filter((template) => template.isDefault &&
    !starterTemplates.some((starter) => starter.name === template.name));

  return (
    <section className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Train / Reusable routines</p>
        <h1 className="page-title">Workout Templates</h1>
        <p className="page-copy">Choose a starting routine or create your own.</p>
      </header>

      {error && <p role="alert" className="status-error">{error}</p>}
      {success && <p role="status" className="status-success">{success}</p>}

      {step === 0 ? (
        <>
          <section aria-labelledby="starter-heading">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="starter-heading" ref={startersRef} tabIndex={-1} className="section-title">Choose a starting routine</h2>
              <button type="button" className="btn-secondary" onClick={() => chooseTemplate(emptyTemplate)}>Create from scratch</button>
            </div>
            <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
              {[...starterTemplates, ...suppliedDefaults].map((template) => (
                <button key={template._id || template.name} type="button" onClick={() => chooseTemplate(template)}
                  className="flex items-center justify-between gap-4 border-t border-[#D2CFC7] py-5 text-left transition-colors hover:bg-[#E5E7DF]">
                  <span className="min-w-0">
                    <span className="block font-semibold">{template.name}</span>
                    <span className="mt-1 block text-sm text-stone-500">{template.description}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg text-stone-500">&rarr;</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="saved-templates-heading" className="border-t border-[#D2CFC7] pt-8">
            <h2 id="saved-templates-heading" className="section-title">Your Templates</h2>
            {loading ? <p role="status" className="py-6 text-sm text-stone-500">Loading your templates...</p> : userTemplates.length === 0 ? (
              <div className="py-6">
                <p className="font-semibold">No templates yet.</p>
                <p className="mt-2 text-sm text-stone-500">Start with Push, Pull, Legs, Upper, or Lower, or create your own. Save a routine to reuse its exercise list.</p>
                <button type="button" className="btn-secondary mt-5" onClick={() => startersRef.current?.focus()}>Choose Starter Template</button>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-[#D2CFC7]">
                {userTemplates.map((template) => (
                  <article key={template._id} className="flex flex-wrap items-center justify-between gap-5 py-6">
                    <div className="min-w-0 flex-1 basis-64">
                      <h3 className="break-words font-semibold">{template.name}</h3>
                      <p className="mt-1 text-sm text-stone-500">{template.exercises?.length || 0} exercises</p>
                      <p className="mt-1 text-sm text-stone-500">{[...new Set(template.exercises?.map((exercise) => exercise.muscleGroup).filter(Boolean))].join(' / ')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" disabled={saving} onClick={() => startWorkout(template)} className="btn-primary">Start Workout</button>
                      <button type="button" disabled={saving} onClick={() => chooseTemplate(template, template._id)} className="btn-secondary">Edit</button>
                      <details className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
                        onKeyDown={(event) => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus(); } }}>
                        <summary aria-label={`More actions for ${template.name}`} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-[#D2CFC7] text-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2f4f46]">...</summary>
                        <div className="absolute right-0 z-20 mt-2 w-44 rounded-md border border-[#D2CFC7] bg-[#FAF9F6] p-2 shadow-sm">
                          <button type="button" disabled={saving} onClick={() => deleteTemplate(template)} className="btn-danger w-full">Delete template</button>
                        </div>
                      </details>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); if (step < 3) nextStep(); else saveTemplate(); }} className="max-w-4xl">
          <fieldset disabled={saving} className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ol aria-label="Template creation steps" className="flex flex-wrap gap-5 text-sm">
                {stepNames.map((name, index) => <li key={name} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'font-semibold text-[#203b33]' : 'text-stone-500'}>{index + 1}. {name}</li>)}
              </ol>
              <button type="button" className="btn-secondary" onClick={() => { setStep(0); setError(''); }}>Cancel</button>
            </div>
            <div>
              <h2 ref={headingRef} tabIndex={-1} className="section-title">{stepNames[step - 1]}</h2>
              <p className="section-copy">{step === 1 ? 'Give this routine a name you will recognize.' : step === 2 ? 'Keep the exercise order that works for you. Sets, reps, and weight belong to your workout.' : 'Check the exercise list, then save it or begin training.'}</p>
            </div>

            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block"><span className="text-sm font-medium">Name</span><input className="form-field" value={formData.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
                <label className="block"><span className="text-sm font-medium">Category</span><select className="form-field" value={formData.category} onChange={(event) => updateField('category', event.target.value)}>
                  <option value="strength">Strength</option><option value="bodybuilding">Bodybuilding</option><option value="powerlifting">Powerlifting</option><option value="custom">Custom</option>
                </select></label>
                <label className="block sm:col-span-2"><span className="text-sm font-medium">Description (optional)</span><textarea rows={2} className="form-field" value={formData.description} onChange={(event) => updateField('description', event.target.value)} /></label>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="divide-y divide-[#D2CFC7] border-y border-[#D2CFC7]">
                  {formData.exercises.map((exercise, index) => (
                    <div key={index} className="py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0"><h3 className="break-words font-semibold">{exercise.exerciseName || 'New exercise'}</h3><p className="mt-1 text-sm text-stone-500">{exercise.muscleGroup || 'Muscle group not set'}</p></div>
                        <div className="flex gap-2">
                          <button type="button" className="btn-secondary px-3" aria-label={`${editingExercise === index ? 'Finish editing' : 'Edit'} ${exercise.exerciseName || 'new exercise'}`} aria-expanded={editingExercise === index} onClick={() => setEditingExercise(editingExercise === index ? null : index)}>{editingExercise === index ? 'Done' : 'Edit'}</button>
                          <button type="button" className="px-3 py-2 text-sm text-stone-500 underline underline-offset-4" aria-label={`Remove ${exercise.exerciseName || 'new exercise'}`} onClick={() => { updateField('exercises', formData.exercises.filter((_, i) => i !== index)); setEditingExercise(null); }}>Remove</button>
                        </div>
                      </div>
                      {editingExercise === index && (
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <label className="block"><span className="text-sm font-medium">Exercise name</span><input autoFocus required value={exercise.exerciseName} onChange={(event) => updateExercise(index, 'exerciseName', event.target.value)} className="form-field" /></label>
                          <label className="block"><span className="text-sm font-medium">Muscle group</span><input value={exercise.muscleGroup} onChange={(event) => updateExercise(index, 'muscleGroup', event.target.value)} className="form-field" /></label>
                          <label className="block sm:col-span-2"><span className="text-sm font-medium">Notes (optional)</span><textarea rows={2} value={exercise.notes} onChange={(event) => updateExercise(index, 'notes', event.target.value)} className="form-field" /></label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!formData.exercises.length && <p className="py-5 text-sm text-stone-500">Add the exercises you want to repeat in this routine.</p>}
                <button type="button" className="btn-secondary mt-5" onClick={() => { setEditingExercise(formData.exercises.length); updateField('exercises', [...formData.exercises, { ...emptyExercise }]); }}>Add Exercise</button>
              </div>
            )}

            {step === 3 && (
              <section className="border-y border-[#D2CFC7] py-6">
                <h3 className="text-xl font-semibold">{formData.name}</h3>
                <p className="mt-2 text-sm text-stone-500">{formData.exercises.length} exercises / {formData.category}</p>
                {formData.description && <p className="mt-3 text-sm text-stone-500">{formData.description}</p>}
                <ol className="mt-5 divide-y divide-[#D2CFC7]">
                  {formData.exercises.map((exercise, index) => <li key={index} className="py-3"><p className="font-medium">{exercise.exerciseName}</p><p className="text-sm text-stone-500">{exercise.muscleGroup}</p>{exercise.notes && <p className="mt-1 text-sm text-stone-500">{exercise.notes}</p>}</li>)}
                </ol>
              </section>
            )}

            <div className="flex flex-wrap gap-3 border-t border-[#D2CFC7] pt-6">
              {step > 1 && <button type="button" className="btn-secondary" onClick={() => { setStep((current) => current - 1); setError(''); }}>Back</button>}
              {step < 3 ? <button type="submit" className="btn-primary">Continue</button> : (
                <>
                  <button type="submit" className="btn-secondary">{saving ? 'Saving...' : 'Save Template'}</button>
                  <button type="button" className="btn-primary" onClick={() => saveTemplate(true)}>{saving ? 'Saving...' : 'Save & Start Workout'}</button>
                </>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}

export default Templates;
