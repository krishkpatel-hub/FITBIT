import api from './axios';
import type { ApiSuccess, Id, ProgramWeek, TrainingMax, Workout } from '../types/domain';

export type TrainingMaxRequest = Omit<Partial<TrainingMax>, '_id' | 'user'> & Pick<TrainingMax, 'liftName' | 'oneRepMax'>;

export interface GenerateProgramRequest {
  week?: number;
  weekNumber?: number;
  maxes?: Record<string, number>;
}

export interface GenerateProgramResponse {
  programWeek?: ProgramWeek;
  week?: ProgramWeek;
  workouts?: Workout[];
  trainingMaxes?: TrainingMax[];
  message?: string;
}

export interface ProgressionUpdateRequest {
  liftName: TrainingMax['liftName'];
  plusSetReps: number;
  weekNumber?: number;
  note?: string;
}

export const trainingMaxService = {
  getTrainingMaxes: async (): Promise<ApiSuccess<TrainingMax[]>> => {
    const response = await api.get('/training-maxes');
    return response.data;
  },
  getProgramWeeks: async (): Promise<ApiSuccess<ProgramWeek[]>> => {
    const response = await api.get('/training-maxes/program-weeks');
    return response.data;
  },
  createTrainingMax: async (data: TrainingMaxRequest): Promise<ApiSuccess<TrainingMax>> => {
    const response = await api.post('/training-maxes', data);
    return response.data;
  },
  updateTrainingMax: async (id: Id, data: Partial<TrainingMaxRequest>): Promise<ApiSuccess<TrainingMax>> => {
    const response = await api.put(`/training-maxes/${id}`, data);
    return response.data;
  },
  deleteTrainingMax: async (id: Id): Promise<ApiSuccess<{ id: Id; message: string }>> => {
    const response = await api.delete(`/training-maxes/${id}`);
    return response.data;
  },
  generateProgram: async (data: GenerateProgramRequest = {}): Promise<ApiSuccess<GenerateProgramResponse>> => {
    const response = await api.post('/training-maxes/generate-program', data);
    return response.data;
  },
  updateProgression: async (data: ProgressionUpdateRequest): Promise<ApiSuccess<TrainingMax>> => {
    const response = await api.post('/training-maxes/update-progression', data);
    return response.data;
  },
};
