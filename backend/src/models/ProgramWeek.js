import mongoose from 'mongoose';

const liftSnapshotSchema = new mongoose.Schema(
  {
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
  },
  { _id: false },
);

const programWeekSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    week: {
      type: Number,
      min: 1,
      max: 4,
      required: true,
    },
    weekNumber: {
      type: Number,
      min: 1,
      max: 4,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['locked', 'current', 'completed'],
      default: 'current',
      index: true,
    },
    daysCompleted: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
    },
    maxesEntered: {
      type: Boolean,
      default: false,
    },
    maxes: {
      squat: {
        type: liftSnapshotSchema,
        required: true,
      },
      bench: {
        type: liftSnapshotSchema,
        required: true,
      },
      deadlift: {
        type: liftSnapshotSchema,
        required: true,
      },
      overhead_press: {
        type: liftSnapshotSchema,
        required: true,
      },
    },
    workouts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workout',
      },
    ],
    dateCreated: {
      type: Date,
      default: Date.now,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

programWeekSchema.index({ user: 1, week: 1 });
programWeekSchema.index({ user: 1, weekNumber: 1 }, { unique: true });
programWeekSchema.index({ user: 1, dateCreated: -1 });

const ProgramWeek = mongoose.model('ProgramWeek', programWeekSchema);

export default ProgramWeek;
