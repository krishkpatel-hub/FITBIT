import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

const publicUserFields = '-password';

const buildAuthResponse = (user) => ({
  user,
  token: generateToken(user._id),
});

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const normalizeUsername = (username = '') => username.trim().toLowerCase();

const validateRequiredFields = (fields) => {
  const missingField = Object.entries(fields).find(([, value]) => value === undefined || value === null || value === '');

  if (missingField) {
    const error = new Error(`${missingField[0]} is required`);
    error.statusCode = 400;
    throw error;
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    profilePicture,
    age,
    gender,
    height,
    weight,
    fitnessGoal,
    activityLevel,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFats,
  } = req.body;

  validateRequiredFields({
    firstName,
    lastName,
    username,
    email,
    password,
  });

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);
  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });

  if (existingUser) {
    res.status(409);
    throw new Error('User with that email or username already exists');
  }

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    profilePicture,
    age,
    gender,
    height,
    weight,
    fitnessGoal,
    activityLevel,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFats,
  });

  const safeUser = await User.findById(user._id).select(publicUserFields);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    ...buildAuthResponse(safeUser),
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { emailOrUsername, email, username, password } = req.body;
  const identifier = emailOrUsername || email || username;

  validateRequiredFields({
    identifier,
    password,
  });

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const safeUser = await User.findById(user._id).select(publicUserFields);

  res.json({
    success: true,
    message: 'User logged in successfully',
    ...buildAuthResponse(safeUser),
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'User logged out successfully. Remove the token on the client.',
  });
});
