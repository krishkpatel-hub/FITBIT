export type Id = string;
export type ISODateString = string;

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiMessage {
  success: boolean;
  message?: string;
}

export interface User {
  _id: Id;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  profilePicture?: string;
  age?: number;
  gender?: '' | 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | 'other';
  height?: number;
  weight?: number;
  fitnessGoal?: '' | 'lose-weight' | 'build-muscle' | 'maintain' | 'increase-strength' | 'improve-endurance';
  activityLevel?: '' | 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export interface AuthResponse extends ApiMessage {
  user: User;
  token: string;
}

export interface WorkoutSet {
  setNumber: number;
  reps?: number;
  weight?: number;
  targetReps?: number;
  completed?: boolean;
  isPlusSet?: boolean;
  rpe?: number;
}

export interface WorkoutExercise {
  exerciseName: string;
  muscleGroup?: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  _id: Id;
  user: Id;
  title: string;
  date: ISODateString;
  type?: string;
  status: 'planned' | 'completed' | 'skipped';
  exercises: WorkoutExercise[];
  duration?: number;
  totalVolume?: number;
  notes?: string;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export interface Exercise {
  _id: Id;
  user: Id;
  name: string;
  muscleGroup?: string;
  category: 'strength' | 'cardio' | 'mobility' | 'accessory';
  equipment?: string;
  notes?: string;
  isTemplate?: boolean;
}

export interface WorkoutTemplateSet {
  setNumber: number;
  targetReps?: number;
  weight?: number;
  isPlusSet?: boolean;
}

export interface WorkoutTemplateExercise {
  exerciseName: string;
  muscleGroup?: string;
  sets: WorkoutTemplateSet[];
  notes?: string;
}

export interface WorkoutTemplate {
  _id: Id;
  user?: Id | null;
  name: string;
  description?: string;
  category: 'strength' | 'bodybuilding' | 'powerlifting' | 'custom';
  exercises: WorkoutTemplateExercise[];
  isDefault?: boolean;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export interface ProgressLog {
  _id: Id;
  user: Id;
  date: ISODateString;
  bodyWeight?: number;
  bodyFatPercentage?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
  notes?: string;
  photos?: string[];
}

export interface PersonalRecord {
  _id: Id;
  user: Id;
  exerciseName: string;
  oneRepMax?: number;
  estimatedOneRepMax?: number;
  weight?: number;
  reps?: number;
  date: ISODateString;
  notes?: string;
}

export interface TrainingMax {
  _id: Id;
  user: Id;
  liftName: 'squat' | 'bench' | 'deadlift' | 'overhead_press';
  oneRepMax: number;
  trainingMax: number;
  currentWeek: number;
  lastUpdated?: ISODateString;
}

export interface ProgramWeek {
  _id: Id;
  user: Id;
  week: number;
  weekNumber: number;
  status: 'locked' | 'current' | 'completed';
  daysCompleted: number;
  maxesEntered: boolean;
  workouts: Id[] | Workout[];
  dateCreated?: ISODateString;
  generatedAt?: ISODateString;
  completedAt?: ISODateString | null;
}

export interface Recommendation {
  _id: Id;
  user: Id;
  type: 'workout' | 'nutrition' | 'progress' | 'recovery';
  title: string;
  message: string;
  source?: string;
  priority: 'low' | 'medium' | 'high';
  isRead?: boolean;
  createdAt?: ISODateString;
}

export interface CoachInsight {
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  dataSource?: string;
  createdAt?: ISODateString;
}
