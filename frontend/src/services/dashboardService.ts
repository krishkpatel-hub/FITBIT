import api from './axios';
import type {
  CoachInsight,
  PersonalRecord,
  ProgressLog,
  Recommendation,
  TrainingMax,
  User,
  Workout,
} from '../types/domain';

export interface DashboardData {
  user?: User;
  trainingMaxes?: TrainingMax[];
  currentWeek?: number;
  lastWorkout?: Workout | null;
  nextWorkout?: Workout | null;
  recommendations?: Recommendation[];
  coachInsights?: CoachInsight[];
  prRecords?: PersonalRecord[];
  progressHistory?: ProgressLog[];
  weeklyWorkoutVolume?: Array<{ week: string; volume: number }>;
  strengthProgression?: Array<Record<string, string | number>>;
  nutritionToday?: null;
}

export const dashboardService = {
  getDashboard: async (): Promise<{ success: boolean; data: DashboardData }> => {
    const response = await api.get('/dashboard');
    return response.data;
  },
  getDashboardData: async (): Promise<{ success: boolean; data: DashboardData }> => {
    const response = await api.get('/dashboard');
    return response.data;
  },
};
