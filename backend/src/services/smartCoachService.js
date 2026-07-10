const liftLabels = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  overhead_press: 'Overhead press',
};

const priorityRank = {
  high: 3,
  medium: 2,
  low: 1,
};

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const daysAgo = (days) => {
  const value = startOfDay(new Date());
  value.setDate(value.getDate() - days);
  return value;
};

const formatLift = (liftName = '') => {
  if (liftLabels[liftName]) return liftLabels[liftName];

  return liftName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const toDate = (value) => new Date(value?.date || value?.createdAt || value?.updatedAt || Date.now());

const roundPercent = (value) => Math.round(value);

const createInsight = ({ title, message, type, priority = 'low', dataSource }) => ({
  title,
  message,
  type,
  priority,
  dataSource,
  createdAt: new Date().toISOString(),
});

const sortInsights = (insights) =>
  insights.sort((a, b) => {
    const priorityDifference = priorityRank[b.priority] - priorityRank[a.priority];
    if (priorityDifference !== 0) return priorityDifference;

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

const getRecentTrainingHistory = (trainingMax, cutoffDate) =>
  [...(trainingMax.history || [])]
    .filter((entry) => toDate(entry) >= cutoffDate)
    .sort((a, b) => toDate(a) - toDate(b));

const buildStrengthInsights = (trainingMaxes) => {
  const insights = [];
  const fourWeeksAgo = daysAgo(28);

  trainingMaxes.forEach((trainingMax) => {
    const history = getRecentTrainingHistory(trainingMax, fourWeeksAgo);
    const liftLabel = formatLift(trainingMax.liftName);

    if (history.length >= 2) {
      const first = history[0];
      const latest = history[history.length - 1];
      const change = (latest.trainingMax || 0) - (first.trainingMax || 0);

      if (change > 0) {
        insights.push(
          createInsight({
            title: `${liftLabel} is moving up`,
            message: `${liftLabel} training max increased ${change} lb over the last 4 weeks.`,
            type: 'strength_progress',
            priority: change >= 10 ? 'medium' : 'low',
            dataSource: 'training_max_history',
          }),
        );
      } else {
        insights.push(
          createInsight({
            title: `${liftLabel} may be plateauing`,
            message: `${liftLabel} has not improved recently. Consider reducing fatigue, improving recovery, or repeating the week before increasing load.`,
            type: 'plateau_warning',
            priority: 'medium',
            dataSource: 'training_max_history',
          }),
        );
      }
    } else if ((trainingMax.history || []).length >= 3) {
      const recentHistory = [...trainingMax.history]
        .sort((a, b) => toDate(a) - toDate(b))
        .slice(-3);
      const first = recentHistory[0];
      const latest = recentHistory[recentHistory.length - 1];
      const change = (latest.trainingMax || 0) - (first.trainingMax || 0);

      if (change <= 0) {
        insights.push(
          createInsight({
            title: `${liftLabel} needs attention`,
            message: `${liftLabel} has been flat across the latest progression entries. Review sleep, recovery, and weekly volume before pushing heavier.`,
            type: 'plateau_warning',
            priority: 'medium',
            dataSource: 'training_max_history',
          }),
        );
      }
    }
  });

  return insights;
};

const buildVolumeInsights = (workouts) => {
  const completedWorkouts = workouts.filter((workout) => workout.status === 'completed');
  const lastTwoWeeksStart = daysAgo(14);
  const previousTwoWeeksStart = daysAgo(28);

  const lastTwoWeeksVolume = completedWorkouts
    .filter((workout) => toDate(workout) >= lastTwoWeeksStart)
    .reduce((total, workout) => total + (workout.totalVolume || 0), 0);

  const previousTwoWeeksVolume = completedWorkouts
    .filter((workout) => toDate(workout) >= previousTwoWeeksStart && toDate(workout) < lastTwoWeeksStart)
    .reduce((total, workout) => total + (workout.totalVolume || 0), 0);

  if (!lastTwoWeeksVolume || !previousTwoWeeksVolume) return [];

  const changePercent = ((lastTwoWeeksVolume - previousTwoWeeksVolume) / previousTwoWeeksVolume) * 100;

  if (Math.abs(changePercent) < 10) return [];

  const direction = changePercent > 0 ? 'increased' : 'decreased';

  return [
    createInsight({
      title: `Training volume ${direction}`,
      message: `Your completed workout volume ${direction} ${Math.abs(roundPercent(changePercent))}% compared with the previous 2 weeks.`,
      type: 'volume_change',
      priority: Math.abs(changePercent) >= 30 ? 'medium' : 'low',
      dataSource: 'workout_history',
    }),
  ];
};

const buildConsistencyInsights = (workouts) => {
  const recentWorkouts = workouts.filter((workout) => toDate(workout) >= daysAgo(30));
  const trackedWorkouts = recentWorkouts.filter((workout) => ['planned', 'completed', 'skipped'].includes(workout.status));

  if (trackedWorkouts.length === 0) return [];

  const completedCount = trackedWorkouts.filter((workout) => workout.status === 'completed').length;
  const completionPercent = roundPercent((completedCount / trackedWorkouts.length) * 100);
  const priority = completionPercent < 60 ? 'medium' : 'low';

  return [
    createInsight({
      title: 'Monthly training consistency',
      message: `You completed ${completionPercent}% of planned workouts this month (${completedCount} of ${trackedWorkouts.length}).`,
      type: 'consistency',
      priority,
      dataSource: 'workout_history',
    }),
  ];
};

const buildRecoveryInsights = (workouts) => {
  const lastWeekCompleted = workouts.filter((workout) => workout.status === 'completed' && toDate(workout) >= daysAgo(7));

  if (lastWeekCompleted.length < 5) return [];

  return [
    createInsight({
      title: 'Recovery check',
      message: `You completed ${lastWeekCompleted.length} workouts in the last 7 days. Watch fatigue and keep at least one lighter recovery day in the week.`,
      type: 'recovery_warning',
      priority: 'medium',
      dataSource: 'workout_consistency',
    }),
  ];
};

const buildPRInsights = (prs) => {
  const recentPRs = prs.filter((pr) => toDate(pr) >= daysAgo(30));

  if (recentPRs.length === 0) return [];

  const newestPR = [...recentPRs].sort((a, b) => toDate(b) - toDate(a))[0];
  const displayMax = newestPR.estimatedOneRepMax || newestPR.oneRepMax || newestPR.weight || 0;

  return [
    createInsight({
      title: 'New personal record logged',
      message: `${newestPR.exerciseName} reached ${displayMax} lb${newestPR.reps ? ` for ${newestPR.reps} reps` : ''} in the last 30 days.`,
      type: 'pr_milestone',
      priority: 'medium',
      dataSource: 'pr_records',
    }),
  ];
};

const buildProgressInsights = (progressLogs) => {
  const recentLogs = progressLogs
    .filter((log) => log.bodyWeight && toDate(log) >= daysAgo(45))
    .sort((a, b) => toDate(a) - toDate(b));

  if (recentLogs.length < 2) return [];

  const first = recentLogs[0];
  const latest = recentLogs[recentLogs.length - 1];
  const change = latest.bodyWeight - first.bodyWeight;
  const changePercent = first.bodyWeight ? (change / first.bodyWeight) * 100 : 0;

  if (Math.abs(changePercent) < 2) return [];

  return [
    createInsight({
      title: 'Body weight trend',
      message: `Body weight ${change > 0 ? 'increased' : 'decreased'} ${Math.abs(change).toFixed(1)} lb across your recent progress logs.`,
      type: 'recovery_warning',
      priority: Math.abs(changePercent) >= 5 ? 'medium' : 'low',
      dataSource: 'progress_logs',
    }),
  ];
};

export const generateSmartCoachInsights = ({
  workouts = [],
  trainingMaxes = [],
  prs = [],
  progressLogs = [],
}) => {
  const insights = [
    ...buildStrengthInsights(trainingMaxes),
    ...buildVolumeInsights(workouts),
    ...buildConsistencyInsights(workouts),
    ...buildRecoveryInsights(workouts),
    ...buildPRInsights(prs),
    ...buildProgressInsights(progressLogs),
  ];

  return sortInsights(insights).slice(0, 12);
};
