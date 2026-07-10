import mongoose from 'mongoose';

const workoutSetSchema = new mongoose.Schema(
  {
    setNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    reps: {
      type: Number,
      min: 0,
      default: 0,
    },
    weight: {
      type: Number,
      min: 0,
      default: 0,
    },
    targetReps: {
      type: Number,
      min: 0,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    isPlusSet: {
      type: Boolean,
      default: false,
    },
    rpe: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
  },
  { _id: false },
);

const workoutExerciseSchema = new mongoose.Schema(
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
      type: [workoutSetSchema],
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

const workoutSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    type: {
      type: String,
      trim: true,
      default: 'strength',
    },
    programWeek: {
      type: Number,
      min: 1,
      max: 4,
      index: true,
    },
    programDay: {
      type: Number,
      min: 1,
      max: 4,
    },
    liftName: {
      type: String,
      enum: ['squat', 'bench', 'deadlift', 'overhead_press'],
    },
    status: {
      type: String,
      enum: ['planned', 'completed', 'skipped'],
      default: 'planned',
    },
    exercises: {
      type: [workoutExerciseSchema],
      default: [],
    },
    duration: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalVolume: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

workoutSchema.methods.calculateTotalVolume = function calculateTotalVolume() {
  return this.exercises.reduce((workoutTotal, exercise) => {
    const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
      if (!set.completed) {
        return setTotal;
      }

      return setTotal + set.reps * set.weight;
    }, 0);

    return workoutTotal + exerciseVolume;
  }, 0);
};

workoutSchema.pre('save', function setTotalVolume(next) {
  this.totalVolume = this.calculateTotalVolume();
  next();
});

workoutSchema.index({ user: 1, date: -1 });
workoutSchema.index({ user: 1, status: 1 });

const Workout = mongoose.model('Workout', workoutSchema);

export default Workout;
