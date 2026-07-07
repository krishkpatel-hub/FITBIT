import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true,
    },
    calories: {
      type: Number,
      min: 0,
      default: 0,
    },
    protein: {
      type: Number,
      min: 0,
      default: 0,
    },
    carbs: {
      type: Number,
      min: 0,
      default: 0,
    },
    fats: {
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
  { _id: false },
);

const nutritionSchema = new mongoose.Schema(
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
    meals: {
      type: [mealSchema],
      default: [],
    },
    totalCalories: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalProtein: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalCarbs: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalFats: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true },
);

nutritionSchema.methods.calculateDailyTotals = function calculateDailyTotals() {
  return this.meals.reduce(
    (totals, meal) => ({
      totalCalories: totals.totalCalories + meal.calories,
      totalProtein: totals.totalProtein + meal.protein,
      totalCarbs: totals.totalCarbs + meal.carbs,
      totalFats: totals.totalFats + meal.fats,
    }),
    {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
    },
  );
};

nutritionSchema.pre('save', function setDailyTotals(next) {
  const totals = this.calculateDailyTotals();

  this.totalCalories = totals.totalCalories;
  this.totalProtein = totals.totalProtein;
  this.totalCarbs = totals.totalCarbs;
  this.totalFats = totals.totalFats;

  next();
});

nutritionSchema.index({ user: 1, date: -1 });

const Nutrition = mongoose.model('Nutrition', nutritionSchema);

export default Nutrition;
