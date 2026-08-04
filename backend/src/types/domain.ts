import type { Request } from 'express';
import type { HydratedDocument, Types } from 'mongoose';

export type ObjectId = Types.ObjectId;

export interface User {
  _id: ObjectId;
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
}

export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<User, UserMethods>;

export interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}
