const LIFT_LABELS = {
  squat: 'Squat',
  bench: 'Bench Press',
  deadlift: 'Deadlift',
  overhead_press: 'Overhead Press',
};

const WEEK_TEMPLATES = {
  1: [
    { percent: 65, targetReps: 5 },
    { percent: 75, targetReps: 5 },
    { percent: 85, targetReps: 5, isPlusSet: true },
    { percent: 75, targetReps: 5 },
    { percent: 70, targetReps: 5 },
    { percent: 65, targetReps: 5 },
  ],
  2: [
    { percent: 70, targetReps: 3 },
    { percent: 80, targetReps: 3 },
    { percent: 90, targetReps: 3, isPlusSet: true },
    { percent: 80, targetReps: 3 },
    { percent: 75, targetReps: 3 },
    { percent: 70, targetReps: 3 },
  ],
  3: [
    { percent: 75, targetReps: 5 },
    { percent: 85, targetReps: 3 },
    { percent: 95, targetReps: 1, isPlusSet: true },
    { percent: 85, targetReps: 3 },
    { percent: 80, targetReps: 3 },
    { percent: 75, targetReps: 3 },
  ],
  4: [
    { percent: 40, targetReps: 5 },
    { percent: 50, targetReps: 5 },
    { percent: 60, targetReps: 5 },
  ],
};

export const supportedLifts = Object.keys(LIFT_LABELS);

export const getLiftLabel = (liftName) => LIFT_LABELS[liftName] || liftName;

export const roundToNearestFive = (value) => Math.round(Number(value) / 5) * 5;

export const calculateTrainingMax = (oneRepMax) => roundToNearestFive(Number(oneRepMax) * 0.9);

export const calculateSetWeight = (trainingMax, percent) => roundToNearestFive(Number(trainingMax) * (percent / 100));

export const getIncreaseAmount = (plusSetReps) => {
  const reps = Number(plusSetReps);

  if (reps <= 1) {
    return 0;
  }

  if (reps <= 3) {
    return 5;
  }

  if (reps === 5) {
    return 10;
  }

  if (reps > 5) {
    return 15;
  }

  return 0;
};

export const getNextWeek = (currentWeek) => (Number(currentWeek) >= 4 ? 1 : Number(currentWeek) + 1);

export const generateWeeklyProgram = (trainingMaxes, requestedWeek) => {
  return trainingMaxes.map((trainingMax, index) => {
    const week = Number(requestedWeek || trainingMax.currentWeek || 1);
    const template = WEEK_TEMPLATES[week] || WEEK_TEMPLATES[1];
    const liftLabel = getLiftLabel(trainingMax.liftName);

    return {
      title: `Week ${week} ${liftLabel}`,
      date: new Date(Date.now() + index * 24 * 60 * 60 * 1000),
      type: 'smart-adaptive',
      status: 'planned',
      notes: `Generated from ${liftLabel} training max of ${trainingMax.trainingMax}.`,
      exercises: [
        {
          exerciseName: liftLabel,
          muscleGroup: trainingMax.liftName,
          notes: `Week ${week} generated working sets.`,
          sets: template.map((set, index) => ({
            setNumber: index + 1,
            reps: 0,
            weight: calculateSetWeight(trainingMax.trainingMax, set.percent),
            targetReps: set.targetReps,
            percent: set.percent,
            completed: false,
            isPlusSet: Boolean(set.isPlusSet),
            rpe: 0,
          })),
        },
      ],
    };
  });
};

export const generateRecommendation = ({ liftName, increaseAmount, plusSetReps }) => {
  const liftLabel = getLiftLabel(liftName);

  if (increaseAmount === 0) {
    return {
      title: `Maintain ${liftLabel} Training Max`,
      message: `${plusSetReps} plus-set reps suggests holding your ${liftLabel} training max steady this week.`,
      priority: 'medium',
    };
  }

  if (increaseAmount >= 15) {
    return {
      title: `${liftLabel} Progression Ahead`,
      message: `Excellent performance on ${liftLabel}. Increase training max by ${increaseAmount} lb.`,
      priority: 'high',
    };
  }

  return {
    title: `Increase ${liftLabel} Training Max`,
    message: `Increase ${liftLabel} training max by ${increaseAmount} lb based on ${plusSetReps} plus-set reps.`,
    priority: 'medium',
  };
};
