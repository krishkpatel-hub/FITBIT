export const getWorkouts = async (req, res) => {
  res.json({ message: 'Get workouts endpoint placeholder', workouts: [] });
};

export const createWorkout = async (req, res) => {
  res.status(201).json({ message: 'Create workout endpoint placeholder' });
};

export const getWorkoutById = async (req, res) => {
  res.json({ message: 'Get workout by ID endpoint placeholder', id: req.params.id });
};

