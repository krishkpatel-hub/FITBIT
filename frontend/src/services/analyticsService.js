import { workoutService } from './workoutService';
import { progressService } from './progressService';
import { trainingMaxService } from './trainingMaxService';
import { prService } from './prService';

const unwrap = (response) => response?.data || [];

export const analyticsService = {
  getAnalyticsData: async () => {
    const [workouts, progressLogs, trainingMaxes, prs] = await Promise.all([
      workoutService.getWorkouts(),
      progressService.getProgressLogs(),
      trainingMaxService.getTrainingMaxes(),
      prService.getPRRecords(),
    ]);

    return {
      workouts: unwrap(workouts),
      progressLogs: unwrap(progressLogs),
      trainingMaxes: unwrap(trainingMaxes),
      prs: unwrap(prs),
    };
  },
};
