import type { AxiosError } from 'axios';
import api from './axios';
import type { ApiMessage, AuthResponse, User } from '../types/domain';

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  emailOrUsername?: string;
  email?: string;
  username?: string;
  password: string;
}

export type ProfileUpdateRequest = Partial<
  Pick<User, 'firstName' | 'lastName' | 'username' | 'email' | 'age' | 'gender' | 'height' | 'weight' | 'fitnessGoal' | 'activityLevel'>
>;

interface BackendErrorBody {
  message?: string;
}

const throwBackendMessage = (error: AxiosError<BackendErrorBody>): never => {
  const backendMessage = error.response?.data?.message;

  if (backendMessage) {
    error.message = backendMessage;
  }

  throw error;
};

export const authService = {
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      return throwBackendMessage(error as AxiosError<BackendErrorBody>);
    }
  },
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      return throwBackendMessage(error as AxiosError<BackendErrorBody>);
    }
  },
  getCurrentUser: async (): Promise<{ success: boolean; user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateProfile: async (profileData: ProfileUpdateRequest): Promise<{ success: boolean; user: User }> => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  },
  logout: async (): Promise<ApiMessage> => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};
