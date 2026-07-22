import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';

const allowedProfileFields = [
  'firstName',
  'lastName',
  'username',
  'email',
  'profilePicture',
  'age',
  'gender',
  'height',
  'weight',
  'fitnessGoal',
  'activityLevel',
];

const normalizeUniqueFields = (updates) => {
  if (updates.email) {
    updates.email = updates.email.trim().toLowerCase();
  }

  if (updates.username) {
    updates.username = updates.username.trim().toLowerCase();
  }

  return updates;
};

export const getUserProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const updates = allowedProfileFields.reduce((profileUpdates, field) => {
    if (req.body[field] !== undefined) {
      profileUpdates[field] = req.body[field];
    }

    return profileUpdates;
  }, {});

  normalizeUniqueFields(updates);

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error('No valid profile fields provided');
  }

  if (updates.email || updates.username) {
    const duplicateUser = await User.findOne({
      _id: mongoose.trusted({ $ne: req.user._id }),
      $or: [
        ...(updates.email ? [{ email: updates.email }] : []),
        ...(updates.username ? [{ username: updates.username }] : []),
      ],
    });

    if (duplicateUser) {
      res.status(409);
      throw new Error('Email or username is already in use');
    }
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).select('-password');

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: updatedUser,
  });
});
