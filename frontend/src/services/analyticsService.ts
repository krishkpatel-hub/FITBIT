import { workoutService } from './workoutService';
import { progressService } from './progressService';
import { trainingMaxService } from './trainingMaxService';
import { prService } from './prService';
import type { ApiSuccess, PersonalRecord, ProgressLog, TrainingMax, Workout } from '../types/domain';

const unwrap = <T>(response: ApiSuccess<T[]>): T[] => response?.data || [];

export interface AnalyticsData {
  workouts: Workout[];
  progressLogs: ProgressLog[];
  trainingMaxes: TrainingMax[];
  prs: PersonalRecord[];
}

export const analyticsService = {
  getAnalyticsData: async (): Promise<AnalyticsData> => {
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
