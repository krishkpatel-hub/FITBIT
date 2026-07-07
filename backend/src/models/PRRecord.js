import mongoose from 'mongoose';

const prRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exerciseName: {
      type: String,
      required: true,
      trim: true,
    },
    oneRepMax: {
      type: Number,
      min: 0,
      default: 0,
    },
    estimatedOneRepMax: {
      type: Number,
      min: 0,
      default: 0,
    },
    weight: {
      type: Number,
      min: 0,
      default: 0,
    },
    reps: {
      type: Number,
      min: 0,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

prRecordSchema.index({ user: 1, exerciseName: 1, date: -1 });

const PRRecord = mongoose.model('PRRecord', prRecordSchema);

export default PRRecord;

