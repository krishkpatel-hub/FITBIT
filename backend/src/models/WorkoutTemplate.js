import mongoose from 'mongoose';

const templateSetSchema = new mongoose.Schema(
  {
    setNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    targetReps: {
      type: Number,
      min: 0,
      default: 0,
    },
    weight: {
      type: Number,
      min: 0,
      default: 0,
    },
    isPlusSet: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const templateExerciseSchema = new mongoose.Schema(
  {
    exerciseName: {
      type: String,
      required: true,
      trim: true,
    },
    muscleGroup: {
      type: String,
      trim: true,
      default: '',
    },
    sets: {
      type: [templateSetSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
);

const workoutTemplateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['strength', 'bodybuilding', 'powerlifting', 'custom'],
      default: 'custom',
    },
    exercises: {
      type: [templateExerciseSchema],
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

workoutTemplateSchema.index({ user: 1, createdAt: -1 });
workoutTemplateSchema.index({ user: 1, name: 1 });
workoutTemplateSchema.index({ isDefault: 1 });

const WorkoutTemplate = mongoose.model('WorkoutTemplate', workoutTemplateSchema);

export default WorkoutTemplate;
