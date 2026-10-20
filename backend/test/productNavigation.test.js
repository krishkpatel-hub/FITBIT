import assert from 'node:assert/strict';
import test from 'node:test';
import { appNavigationLinks, appPaths, legacyPaths, progressSectionPaths, resolveLegacyPath, sectionNavigation } from '../../frontend/src/utils/navigation.ts';
import { createWorkoutDraft, normalizeTemplatePayload, starterTemplates, toTemplateForm } from '../../frontend/src/utils/templateWorkflow.ts';

test('primary navigation has five task-oriented destinations, with utilities separate', () => {
  assert.deepEqual(appNavigationLinks.map((link) => link.label), ['Home', 'Program', 'Train', 'Progress', 'Coach']);
  assert.equal(appNavigationLinks[0].end, true);
  assert.deepEqual(sectionNavigation.Program.map((link) => link.label), ['Program', 'Calendar']);
  assert.deepEqual(sectionNavigation.Train.map((link) => link.label), ['Start Workout', 'Templates']);
  assert.deepEqual(sectionNavigation.Progress.map((link) => link.label), ['Overview', 'History', 'PRs', 'Body', 'Analytics']);
  assert.ok(!sectionNavigation.Progress.some((link) => link.label === 'Strength Progress'));
  assert.equal(sectionNavigation.Progress[0].to, appPaths.progress);
  assert.equal(sectionNavigation.Progress[0].end, true);
  assert.equal(progressSectionPaths.overview, appPaths.progress);
  assert.ok(!appNavigationLinks.some((link) => link.to === appPaths.profile));
});

test('legacy routes and Progress sections preserve their original destination', () => {
  for (const [oldPath, newPath] of Object.entries(legacyPaths)) {
    assert.equal(resolveLegacyPath(oldPath, ''), newPath);
  }
  for (const [section, destination] of Object.entries(progressSectionPaths)) {
    assert.equal(resolveLegacyPath('/progress', `?section=${section}`), destination);
  }
  assert.equal(resolveLegacyPath('/progress', '?section=training-history&filter=bench'), `${appPaths.history}?filter=bench`);
  assert.equal(resolveLegacyPath('/progress', '?section=strength-progress&filter=bench'), `${appPaths.overview}?filter=bench`);
  assert.equal(resolveLegacyPath('/strength-program', '?week=1'), `${appPaths.program}?week=1`);
  assert.equal(resolveLegacyPath('/progress', '?section=unknown'), appPaths.train);
});

test('all five starters create independent exercise-only drafts without suggested sets', () => {
  assert.deepEqual(starterTemplates.map((template) => template.name), ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body']);
  for (const starter of starterTemplates) {
    const original = structuredClone(starter);
    const form = toTemplateForm(starter);
    assert.ok(form.exercises.length >= 7);
    assert.ok(form.exercises.every((exercise) => !Object.hasOwn(exercise, 'sets')));
    const payload = normalizeTemplatePayload(form);
    const draft = createWorkoutDraft(payload);
    assert.ok(draft.exercises.every((exercise) => exercise.sets.length === 0));
    draft.exercises[0].exerciseName = 'Custom movement';
    draft.exercises[0].sets.push({ reps: 8, weight: 100 });
    assert.deepEqual(starter, original);
    assert.equal(payload.exercises[0].sets.length, 0);
  }
});

test('opening a legacy template does not mutate its stored prescriptions', () => {
  const template = { ...structuredClone(starterTemplates[0]), _id: 'saved-template' };
  template.exercises[0].sets = [{ setNumber: 1, weight: 135, targetReps: 5 }];
  const before = structuredClone(template);
  const draft = createWorkoutDraft(template);
  const form = toTemplateForm(template);
  assert.deepEqual(template, before);
  assert.deepEqual(draft.exercises[0].sets, []);
  assert.ok(!Object.hasOwn(form.exercises[0], 'sets'));
  assert.equal(draft.title, template.name);
});
