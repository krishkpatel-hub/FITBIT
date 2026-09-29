import type { ProgramWeek, TrainingMax, Workout } from '../types/domain';

const liftLabels: Record<TrainingMax['liftName'], string> = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
  overhead_press: 'Overhead Press',
};

type HomeWorkout = Workout & { liftName?: TrainingMax['liftName'] };

export function getHomeTrainingState(trainingMaxes: TrainingMax[], weeks: ProgramWeek[]) {
  const configuredLifts = Object.keys(liftLabels).filter((lift) => trainingMaxes.some((entry) =>
    entry.liftName === lift && Number.isFinite(Number(entry.oneRepMax)) && Number(entry.oneRepMax) > 0));

  // Read persisted program status; Home must not calculate progression or unlock weeks.
  const generatedWeeks = weeks
    .filter((week) => week.status !== 'locked' && week.workouts?.length > 0)
    .slice()
    .sort((a, b) => Number(a.weekNumber || a.week) - Number(b.weekNumber || b.week));
  const currentWeek = generatedWeeks.find((week) => week.status === 'current')
    || generatedWeeks[generatedWeeks.length - 1];
  const weekNumber = currentWeek ? Number(currentWeek.weekNumber || currentWeek.week) : null;
  const weekComplete = currentWeek?.status === 'completed';
  const nextWeekNumber = weekComplete && weekNumber !== null && weekNumber < 4 ? weekNumber + 1 : null;
  const nextWeekMaxesReady = nextWeekNumber !== null && Object.keys(liftLabels).every((lift) =>
    trainingMaxes.some((entry) => entry.liftName === lift && Number(entry.currentWeek) === nextWeekNumber
      && Number.isFinite(Number(entry.oneRepMax)) && Number(entry.oneRepMax) > 0));
  const workouts = (currentWeek?.workouts || []).filter((workout): workout is HomeWorkout =>
    typeof workout === 'object' && workout !== null);
  // Never substitute a custom/future workout from the general dashboard summary.
  const nextWorkout = weekComplete ? undefined : workouts.find((workout) => workout.status === 'planned');

  return {
    configuredLiftCount: configuredLifts.length,
    strengthReady: configuredLifts.length === 4,
    currentWeek,
    weekNumber,
    weekComplete,
    nextWeekNumber,
    nextWeekMaxesReady,
    nextWorkout,
  };
}

export function getHomeWorkoutSummary(workout: HomeWorkout) {
  const mainLift = (workout.liftName && liftLabels[workout.liftName])
    || workout.exercises?.[0]?.exerciseName || null;
  return {
    title: workout.title?.replace(/^Week\s+\d+\s*[-\u2013\u2014]\s*/i, '').trim() || 'Planned workout',
    mainLift,
    exerciseCount: workout.exercises?.length || 0,
  };
}

export function formatHomeDate(date?: string | null): string {
  if (!date || !Number.isFinite(new Date(date).getTime())) return 'Date not recorded';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(date));
}
