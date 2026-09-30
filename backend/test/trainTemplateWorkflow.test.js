import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWorkoutDraft, emptyTemplate, getRecentTemplates, getTemplateMuscleGroups,
  normalizeTemplatePayload, starterTemplates, toTemplateForm, validateTemplate,
} from '../../frontend/src/utils/templateWorkflow.ts';

test('all starters can be reviewed and saved without performed workout fields', () => {
  assert.deepEqual(starterTemplates.map((template) => template.exercises.length), [7, 8, 8, 8, 8]);
  for (const starter of starterTemplates) {
    const form = toTemplateForm(starter);
    assert.equal(validateTemplate(form), '');
    const payload = normalizeTemplatePayload(form);
    assert.deepEqual(Object.keys(payload).sort(), ['category', 'description', 'exercises', 'name']);
    for (const exercise of payload.exercises) {
      assert.deepEqual(exercise.sets, []);
      assert.equal(Object.hasOwn(exercise, 'reps'), false);
      assert.equal(Object.hasOwn(exercise, 'weight'), false);
    }
  }
});

test('template review validates name and every exercise before saving', () => {
  assert.match(validateTemplate(emptyTemplate), /name/);
  assert.match(validateTemplate({ ...emptyTemplate, name: 'Custom' }), /at least one exercise/);
  const form = toTemplateForm(starterTemplates[0]);
  form.exercises.push({ exerciseName: '  ', muscleGroup: '', notes: '' });
  assert.match(validateTemplate(form), /name for each exercise/);
  form.exercises.at(-1).exerciseName = 'Push Up';
  assert.equal(validateTemplate(form), '');
});

test('editing and saving a template strips legacy prescriptions and unrelated fields without mutating it', () => {
  const saved = { ...structuredClone(starterTemplates[0]), _id: 'template-a', user: 'user-a' };
  saved.exercises[0].sets = [{ setNumber: 1, targetReps: 5, weight: 135, isPlusSet: true }];
  const before = structuredClone(saved);
  const form = toTemplateForm(saved);
  form.name = '  My Push Day  ';
  form.exercises[0].notes = 'Pause at the bottom';
  const payload = normalizeTemplatePayload({ ...form, _id: saved._id, user: saved.user, isDefault: true });
  assert.equal(payload.name, 'My Push Day');
  assert.equal(payload.exercises[0].notes, 'Pause at the bottom');
  assert.deepEqual(payload.exercises[0].sets, []);
  assert.equal(Object.hasOwn(payload, 'user'), false);
  assert.equal(Object.hasOwn(payload, '_id'), false);
  assert.equal(Object.hasOwn(payload, 'isDefault'), false);
  assert.deepEqual(saved, before);
});

test('each workout is an independent copy with no template ID or pre-created sets', () => {
  const saved = { ...normalizeTemplatePayload(starterTemplates[0]), _id: 'template-a', user: 'user-a' };
  const before = structuredClone(saved);
  const first = createWorkoutDraft(saved);
  const second = createWorkoutDraft(saved);
  first.exercises[0].exerciseName = 'Paused Bench Press';
  first.exercises[0].notes = 'Session-only note';
  first.exercises[0].sets.push({ setNumber: 1, reps: 8, weight: 135, isPlusSet: true });
  first.exercises.pop();
  first.title = 'Today only';
  assert.deepEqual(saved, before);
  assert.equal(second.exercises.length, 7);
  assert.equal(second.exercises[0].exerciseName, 'Bench Press');
  assert.deepEqual(second.exercises[0].sets, []);
  assert.equal(Object.hasOwn(first, '_id'), false);
  assert.equal(Object.hasOwn(first, 'user'), false);
});

test('recent templates are limited, user-owned, newest-first, and do not reorder the source', () => {
  const templates = [
    { ...starterTemplates[0], _id: 'old', createdAt: '2026-01-01' },
    { ...starterTemplates[1], _id: 'updated', createdAt: '2026-01-02', updatedAt: '2026-09-29' },
    { ...starterTemplates[2], _id: 'default', isDefault: true, updatedAt: '2026-09-30' },
    { ...starterTemplates[3], _id: 'new', createdAt: '2026-09-28' },
    { ...starterTemplates[4], _id: 'undated', createdAt: 'invalid' },
  ];
  const before = structuredClone(templates);
  assert.deepEqual(getRecentTemplates(templates).map((template) => template._id), ['updated', 'new', 'old']);
  assert.deepEqual(templates, before);
  assert.deepEqual(getRecentTemplates([]), []);
});

test('muscle summaries omit empty values and keep unique groups in exercise order', () => {
  assert.deepEqual(getTemplateMuscleGroups(starterTemplates[0]), ['Chest', 'Shoulders', 'Triceps']);
  assert.deepEqual(getTemplateMuscleGroups({ exercises: [{ muscleGroup: ' Chest ' }, { muscleGroup: 'Chest' }, { muscleGroup: '' }, {}] }), ['Chest']);
  assert.deepEqual(getTemplateMuscleGroups({}), []);
});
