import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/authRoutes.js';
import workoutRoutes from './routes/workoutRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import exerciseRoutes from './routes/exerciseRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import userRoutes from './routes/userRoutes.js';
import prRoutes from './routes/prRoutes.js';
import trainingMaxRoutes from './routes/trainingMaxRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import demoRoutes from './routes/demoRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(mongoSanitize());

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FitBit-Strength Backend is Live 🚀',
    version: '1.0.0',
  });
});

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
      '/api/templates',
      '/api/progress',
      '/api/prs',
      '/api/training-maxes',
      '/api/recommendations',
      '/api/dashboard',
      '/api/coach',
      ...(process.env.NODE_ENV === 'production' ? [] : ['/api/demo/seed']),
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prs', prRoutes);
app.use('/api/training-maxes', trainingMaxRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coach', coachRoutes);
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/demo', demoRoutes);
}

app.use(notFound);
app.use(errorHandler);

export default app;
