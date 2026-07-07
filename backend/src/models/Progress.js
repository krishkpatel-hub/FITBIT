import mongoose from 'mongoose';

const measurementSchema = new mongoose.Schema(
  {
    chest: {
      type: Number,
      min: 0,
      default: 0,
    },
    waist: {
      type: Number,
      min: 0,
      default: 0,
    },
    hips: {
      type: Number,
      min: 0,
      default: 0,
    },
    arms: {
      type: Number,
      min: 0,
      default: 0,
    },
    thighs: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    bodyWeight: {
      type: Number,
      min: 0,
      default: 0,
    },
    bodyFatPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    measurements: {
      type: measurementSchema,
      default: () => ({}),
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    photos: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

progressSchema.index({ user: 1, date: -1 });

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;
