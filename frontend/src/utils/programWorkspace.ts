import type { ProgramWeek, TrainingMax, Workout } from '../types/domain';

export const isProgramWeekComplete = (week?: ProgramWeek | null): boolean =>
  Boolean(week?.workouts?.length && week.workouts.length >= 4 && week.workouts.every((workout) => typeof workout !== 'string' && workout.status === 'completed'));

export const getActiveProgramWeekNumber = (weeks: ProgramWeek[]): number => {
  for (let week = 1; week <= 4; week += 1) {
    if (!isProgramWeekComplete(weeks.find((entry) => Number(entry.week) === week))) return week;
  }
  return 4;
};

export const getWeekViewStatus = (week: number, activeWeek: number, weeks: ProgramWeek[]): 'locked' | 'completed' | 'current' => {
  if (week > activeWeek) return 'locked';
  return isProgramWeekComplete(weeks.find((entry) => Number(entry.week) === week)) ? 'completed' : 'current';
};

export const getNextWorkoutIndex = (workouts: Workout[], selectedWorkoutId?: string | null): number => {
  if (selectedWorkoutId) {
    const selected = workouts.findIndex((workout) => workout._id === selectedWorkoutId);
    if (selected >= 0) return selected;
  }
  const next = workouts.findIndex((workout) => workout.status !== 'completed');
  return next >= 0 ? next : 0;
};

export const getCompletedSetCount = (workout?: Workout | null): { completed: number; total: number } => {
  const sets = workout?.exercises?.flatMap((exercise) => exercise.sets || []) || [];
  return { completed: sets.filter((set) => set.completed).length, total: sets.length };
};

export const canApplyProgression = ({ week, activeWeek, generated, hasPlusSet, trainingMaxWeek }: {
  week: number;
  activeWeek: number;
  generated: boolean;
  hasPlusSet: boolean;
  trainingMaxWeek: number;
}): boolean => week <= activeWeek && generated && hasPlusSet && trainingMaxWeek === week;

export const getProgramStage = (maxes: TrainingMax[], week?: ProgramWeek | null, selectedWeek = 1): 'setup' | 'maxes-needed' | 'ready' | 'workout' => {
  if (week?.workouts?.length) return 'workout';
  const required = ['squat', 'bench', 'deadlift', 'overhead_press'];
  const allSaved = required.every((lift) => maxes.some((max) => max.liftName === lift && Number(max.oneRepMax) > 0));
  if (!allSaved) return 'setup';
  const readyForWeek = required.every((lift) => maxes.some((max) => max.liftName === lift && Number(max.currentWeek || 1) === selectedWeek));
  return readyForWeek ? 'ready' : 'maxes-needed';
};
