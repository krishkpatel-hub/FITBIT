import mongoose from 'mongoose';

const trainingMaxHistorySchema = new mongoose.Schema(
  {
    week: {
      type: Number,
      min: 1,
      required: true,
    },
    liftName: {
      type: String,
      enum: ['squat', 'bench', 'deadlift', 'overhead_press'],
    },
    oneRepMax: {
      type: Number,
      min: 0,
      default: 0,
    },
    trainingMax: {
      type: Number,
      min: 0,
      default: 0,
    },
    plusSetReps: {
      type: Number,
      min: 0,
      default: 0,
    },
    increaseAmount: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const trainingMaxSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    liftName: {
      type: String,
      enum: ['squat', 'bench', 'deadlift', 'overhead_press'],
      required: true,
    },
    oneRepMax: {
      type: Number,
      min: 0,
      required: true,
    },
    trainingMax: {
      type: Number,
      min: 0,
      required: true,
    },
    currentWeek: {
      type: Number,
      min: 1,
      default: 1,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
    history: {
      type: [trainingMaxHistorySchema],
      default: [],
    },
  },
  { timestamps: true },
);

trainingMaxSchema.index({ user: 1, liftName: 1 }, { unique: true });
trainingMaxSchema.index({ user: 1, lastUpdated: -1 });

const TrainingMax = mongoose.model('TrainingMax', trainingMaxSchema);

export default TrainingMax;
