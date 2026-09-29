import type { WorkoutTemplate } from '../types/domain';

export const WORKOUT_DRAFT_STORAGE_KEY = 'getjackedcoach.workoutDraft';
export type TemplateForm = {
  name: string;
  description: string;
  category: WorkoutTemplate['category'];
  exercises: Array<{ exerciseName: string; muscleGroup: string; notes: string }>;
};

export const emptyTemplate: TemplateForm = {
  name: '',
  description: '',
  category: 'strength',
  exercises: [],
};

export const emptyExercise = {
  exerciseName: '',
  muscleGroup: '',
  notes: '',
};

export const starterTemplates: TemplateForm[] = [
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

export const normalizeTemplatePayload = (template: TemplateForm) => ({
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

export const toTemplateForm = (template: Partial<WorkoutTemplate>): TemplateForm => ({
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

export const createWorkoutDraft = (template: Partial<WorkoutTemplate>) => ({
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
