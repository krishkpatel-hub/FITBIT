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
const emailPattern = /^\S+@\S+\.\S+$/;

const validateRequiredFields = (fields) => {
  const missingField = Object.entries(fields).find(([, field]) => {
    const value = field.value;
    return value === undefined || value === null || (typeof value === 'string' ? value.trim() === '' : value === '');
  });

  if (missingField) {
    const error = new Error(`${missingField[1].label} is required`);
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
  } = req.body;

  validateRequiredFields({
    firstName: { label: 'First name', value: firstName },
    lastName: { label: 'Last name', value: lastName },
    username: { label: 'Username', value: username },
    email: { label: 'Email', value: email },
    password: { label: 'Password', value: password },
  });

  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);

  if (!emailPattern.test(normalizedEmail)) {
    res.status(400);
    throw new Error('Invalid email address');
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });

  if (existingEmail) {
    res.status(409);
    throw new Error('Email already exists');
  }

  const existingUsername = await User.findOne({ username: normalizedUsername });

  if (existingUsername) {
    res.status(409);
    throw new Error('Username already exists');
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
    identifier: { label: 'Email or username', value: identifier },
    password: { label: 'Password', value: password },
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
