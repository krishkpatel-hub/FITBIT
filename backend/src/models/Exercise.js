import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    muscleGroup: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['strength', 'cardio', 'mobility', 'accessory'],
      required: true,
      default: 'strength',
    },
    equipment: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

exerciseSchema.index({ user: 1, name: 1 });
exerciseSchema.index({ user: 1, muscleGroup: 1 });

const Exercise = mongoose.model('Exercise', exerciseSchema);

export default Exercise;
