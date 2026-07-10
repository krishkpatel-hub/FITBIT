# FitBit-Strength

FitBit-Strength is a full-stack MERN strength-training platform that generates personalized weekly workout programs from user-entered one-rep maxes. It securely tracks training maxes, weekly programs, personal records, progress, calendar history, analytics, templates, and coaching insights for each authenticated user.

## Live Links

- Live Demo: Add after deployment
- GitHub Repository: git@github.com:krishkpatel-hub/FITBIT.git

## Core Features

- Secure user registration and login with JWT authentication
- Private user-specific MongoDB data
- One-rep-max and training-max calculations
- Four-day weekly strength program:
  - Bench Press
  - Deadlift
  - Squat
  - Overhead Press
- Locked weekly progression
- New max entry before generating each new week
- Plus-set performance tracking
- One program-history record per user per week
- Progress and training-max visualizations
- Workout calendar
- Personal-record tracking
- Reusable workout templates
- Training analytics
- Data-driven coaching insights
- Responsive desktop, tablet, and mobile design

## How the Program Works

1. A user creates an account and logs in.
2. The user enters one-rep maxes for Bench Press, Deadlift, Squat, and Overhead Press.
3. The application calculates training maxes.
4. The application generates the current week with four training days.
5. Future weeks remain locked.
6. The user completes all four workouts.
7. The application asks for updated maxes before generating the next week.
8. Program history stores one weekly max record per user.

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Axios
- React Router
- Recharts
- Framer Motion
- Three.js / React Three Fiber

### Backend

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT
- bcrypt
- express-async-handler

## Architecture

- React frontend for UI and client-side routing
- Axios service layer for backend communication
- Express REST API for authentication, program generation, training data, progress, records, templates, analytics, and coaching data
- MongoDB Atlas for cloud persistence
- JWT middleware for authentication and user isolation
- Mongoose models scoped by `user` for private user-owned data

## Project Structure

```text
FitBit-Strength/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/
      app.js
      server.js
    package.json
    nodemon.json
  frontend/
    public/
    src/
      assets/
      components/
      context/
      hooks/
      layouts/
      pages/
      services/
      styles/
      utils/
      App.jsx
      main.jsx
    package.json
    vite.config.js
  docker-compose.yml
  README.md
```

## Local Development

### Prerequisites

- Node.js
- npm
- MongoDB Atlas account

### Clone

```bash
git clone git@github.com:krishkpatel-hub/FITBIT.git FitBit-Strength
cd FitBit-Strength
```

### Backend Setup

Create `backend/.env`:

```env
PORT=3000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

Install and run the backend:

```bash
cd backend
npm install
npm run dev
```

The backend runs on:

```text
http://localhost:3000
```

### Frontend Setup

Install and run the frontend:

```bash
cd frontend
npm install
npm run dev -- --port 5174
```

The frontend runs on:

```text
http://localhost:5174
```

## Docker Development

A `docker-compose.yml` file is included for local container-based development.

```bash
docker compose up
```

The compose setup uses `backend/.env` for backend environment variables.

## API Overview

All private endpoints require:

```http
Authorization: Bearer <jwt>
```

Core API groups:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/users/profile`
- `GET /api/dashboard`
- `GET /api/coach/insights`
- `GET /api/training-maxes`
- `GET /api/training-maxes/program-weeks`
- `POST /api/training-maxes/generate-program`
- `POST /api/training-maxes/update-progression`
- `GET /api/workouts`
- `PUT /api/workouts/:id`
- `POST /api/workouts/:id/duplicate`
- `GET /api/templates`
- `POST /api/templates/:id/start-workout`
- `GET /api/progress`
- `GET /api/prs`
- `POST /api/demo/seed` development only

## Main Frontend Routes

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/strength-program`
- `/progress`
- `/calendar`
- `/prs`
- `/analytics`
- `/coach`
- `/templates`
- `/profile`

## Environment Notes

- `backend/.env` is required locally and is intentionally ignored by Git.
- No `.env.example` file is currently included.
- MongoDB Atlas must allow connections from your current IP address.
- JWTs are stored in `localStorage` for this MVP.
- The development-only demo seed endpoint is disabled when `NODE_ENV=production`.

## Deployment Notes

- No production deployment configuration is currently committed.
- Add the live frontend and backend URLs after deployment.
- Update the frontend API base URL before deploying if the backend is not running at `http://localhost:3000/api`.

## Design System

FitBit-Strength uses a restrained dark productivity-app interface:

- Near-black and charcoal backgrounds
- Off-white primary text
- Muted gray secondary text
- Restrained gold and green accents
- Subtle borders instead of glow effects
- Compact, readable layouts
- No neon colors, aurora backgrounds, emoji decoration, or purple gradients

Navigation order:

Dashboard, Strength Program, Progress, Calendar, PRs, Analytics, Coach, Templates, Profile.

## Demo Flow

1. Register or log in.
2. Open Strength Program.
3. Enter one-rep maxes for Bench Press, Deadlift, Squat, and Overhead Press.
4. Generate Week 1.
5. Complete all four training days.
6. Enter updated maxes to unlock and generate the next week.
7. Review progress in Dashboard, Calendar, PRs, Analytics, and Coach.

## Verification

Frontend production build:

```bash
cd frontend
npm run build
```

Backend import check:

```bash
cd backend
node -e "import('./src/app.js').then(() => console.log('backend app imports cleanly'))"
```

## Screenshots

Add screenshots after deployment:

- Home
- Dashboard
- Strength Program
- Calendar
- Analytics
- Coach

## Resume Bullet

Built a full-stack MERN strength-training platform with JWT authentication, user-scoped MongoDB data models, adaptive weekly strength programming, locked progression, program history, progress tracking, PR tracking, Recharts analytics, and data-driven coaching insights.
