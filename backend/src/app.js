import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import workoutRoutes from './routes/workoutRoutes.js';
import exerciseRoutes from './routes/exerciseRoutes.js';
import nutritionRoutes from './routes/nutritionRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import userRoutes from './routes/userRoutes.js';
import prRoutes from './routes/prRoutes.js';
import trainingMaxRoutes from './routes/trainingMaxRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'FitBit-Strength API',
    health: '/api/health',
    routes: [
      '/api/auth',
      '/api/users',
      '/api/exercises',
      '/api/workouts',
      '/api/nutrition',
      '/api/progress',
      '/api/prs',
      '/api/training-maxes',
      '/api/recommendations',
      '/api/dashboard',
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FitBit-Strength API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prs', prRoutes);
app.use('/api/training-maxes', trainingMaxRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
