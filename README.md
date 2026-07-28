# GetJackedCoach

GetJackedCoach is a full-stack MERN strength-training application for generating weekly strength programs, tracking workout history, reviewing progress, and surfacing coaching insights for authenticated users.

## Live Demo

- Frontend: https://getjackedcoach.com
- GitHub Repository: git@github.com:krishkpatel-hub/FITBIT.git

## Screenshots

Current product screenshots are stored in `frontend/public/screenshots/`.

- Strength Program: `frontend/public/screenshots/strength-program.jpg`
- Analytics: `frontend/public/screenshots/analytics.jpg`
- Workout Templates: `frontend/public/screenshots/templates.jpg`
- Coach Insights: `frontend/public/screenshots/coach.jpg`

## Engineering Highlights

- Full-stack React, Express, and MongoDB architecture
- JWT-based authentication with protected API routes
- User-scoped Mongoose models for private training data
- REST API organized by feature area
- Adaptive weekly strength-program generation from user-entered maxes
- React Router application with protected client routes
- Axios service layer with bearer-token attachment and timeout handling
- Responsive Tailwind CSS interface
- Security middleware: Helmet, CORS allowlist, request body limits, NoSQL sanitization, auth rate limiting, and production-safe 500 responses
- Vercel SPA rewrite configuration for client-side route refreshes
- Docker Compose configuration for local containerized development
- GitHub Actions CI for lint checks, tests, frontend build, and backend syntax build

## Key Features

### Implemented

- Register, login, logout, current-user lookup, and profile update
- Strength-focused profile fields with height and weight unit handling
- Four-day weekly strength program:
  - Bench Press
  - Deadlift
  - Squat
  - Overhead Press
- Locked weekly progression from Week 1 through Week 4
- One program-history record per user per week
- Training-max and one-rep-max calculations
- Workout data model and APIs used by program history, calendar, analytics, coach, and templates
- Workout calendar and chronological training history
- Progress log tracking for body weight, body fat, and measurements
- Personal records center with estimated 1RM support
- Reusable workout templates with user-controlled exercises and optional manual sets
- Analytics dashboard for strength, volume, consistency, and PR signals
- Smart Coach insights generated from the logged-in user's training data
- Development-only demo seed endpoint, disabled in production

### Future Improvements

- Add a password reset flow
- Add refresh-token or HttpOnly-cookie auth hardening
- Add broader automated integration tests
- Add screenshot fixtures with safe demo data
- Add role-based moderation/admin tools if the project expands beyond single-user ownership

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- Framer Motion

### Backend

- Node.js
- Express.js
- Mongoose
- JSON Web Tokens
- bcryptjs
- Helmet
- express-rate-limit
- express-mongo-sanitize
- compression
- multer and Cloudinary configuration hooks

### Database

- MongoDB Atlas

### Deployment

- Frontend configuration: Vercel SPA rewrites in `frontend/vercel.json`
- Backend configuration: Express server reads `PORT` from environment variables and exposes health endpoints

### Containerisation

- Docker Compose is available for local frontend/backend development

### Testing

- Node.js built-in test runner for backend utility tests

### CI

- GitHub Actions workflow in `.github/workflows/ci.yml`

## Architecture Overview

### Frontend

The frontend is a Vite React app. `frontend/src/App.jsx` defines public and protected routes. `MainLayout` provides the shared shell, and feature pages call backend APIs through service modules in `frontend/src/services/`.

### Backend

The backend is an Express API. `backend/src/app.js` configures middleware, health endpoints, routes, and centralized error handling. `backend/src/server.js` loads environment variables, connects to MongoDB, and starts the server.

### Authentication Flow

Users register or log in through `/api/auth`. The backend verifies credentials, hashes passwords with bcrypt, signs JWTs with `JWT_SECRET`, and returns a token. The frontend stores the token in `localStorage` for this MVP and attaches it to API requests with an Axios interceptor. Protected backend routes populate `req.user` through JWT middleware.

### API Layer

Controllers handle request validation and feature behavior. Routes stay grouped by domain: auth, users, training maxes, workouts, templates, progress, PRs, dashboard, recommendations, and coach insights.

### Database

MongoDB data is modeled with Mongoose. User-created resources include a `user` reference so queries can remain scoped to the authenticated user.

## Project Structure

```text
GetJackedCoach/
  .github/
    ISSUE_TEMPLATE/
    workflows/
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
    test/
    package.json
  frontend/
    public/
      screenshots/
    src/
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
    vercel.json
  scripts/
  docker-compose.yml
  README.md
```

## API Overview

Most API responses use JSON. Private endpoints require:

```http
Authorization: Bearer <jwt>
```

API groups:

- `GET /` and `GET /api/health` for backend health checks
- `/api/auth` for registration, login, current user, and logout
- `/api/users` for profile lookup and updates
- `/api/training-maxes` for training maxes, weekly program generation, program weeks, and progression updates
- `/api/workouts` for workout records and duplication
- `/api/templates` for reusable workout templates and starting planned workouts from templates
- `/api/exercises` for user-created exercise records
- `/api/progress` for progress logs
- `/api/prs` for personal records
- `/api/recommendations` for recommendation records
- `/api/dashboard` for dashboard summary data
- `/api/coach/insights` for generated coach insights
- `/api/demo/seed` for development-only demo data

## Local Setup

### Prerequisites

- Node.js 20 or newer
- npm
- MongoDB Atlas database

### Clone

```bash
git clone git@github.com:krishkpatel-hub/FITBIT.git GetJackedCoach
cd GetJackedCoach
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend defaults to:

```text
http://localhost:3000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev -- --port 5174
```

The frontend defaults to:

```text
http://localhost:5174
```

## Environment Variables

Reference placeholders are available in `.env.example`, `backend/.env.example`, and `frontend/.env.example`.

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Yes | Backend port. |
| `NODE_ENV` | Yes | Controls development-only routes and production error masking. |
| `CLIENT_URL` | Yes | Comma-separated allowed frontend origins for CORS. |
| `MONGO_URI` | Yes | MongoDB Atlas connection string. |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWTs. |
| `JWT_EXPIRES_IN` | No | JWT lifetime. Defaults to `30d`. |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary upload configuration. |
| `CLOUDINARY_API_KEY` | No | Cloudinary upload configuration. |
| `CLOUDINARY_API_SECRET` | No | Cloudinary upload configuration. |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Backend base URL without `/api`. |

## Docker

`docker-compose.yml` runs both services for local development:

```bash
docker compose up
```

The backend service reads `backend/.env`. The frontend service runs Vite on `0.0.0.0`.

## Testing

Run all repository checks from the root:

```bash
npm run lint
npm run test
npm run build
```

Individual commands:

```bash
npm --prefix backend test
npm --prefix frontend run build
npm --prefix backend run build
```

## Security Considerations

Implemented protections:

- Password hashing with bcrypt
- JWT signing and verification
- Auth middleware for protected API routes
- User-scoped MongoDB queries for user-created data
- Helmet security headers
- CORS allowlist through `CLIENT_URL`
- Request body size limits
- NoSQL sanitization
- Rate limiting on login and registration
- Production-safe 500 error responses
- `.env` and generated files ignored by Git

Known limitations:

- JWTs are stored in `localStorage`, which is a practical MVP choice but weaker than an HttpOnly-cookie or refresh-token design.
- Password reset is not implemented.
- The security report notes that old credentials appeared in Git history and should be rotated before production use.
- Automated tests are currently lightweight and do not cover every API route.

## Known Limitations

- The GitHub repository name still references the original project name.
- The frontend uses the configured `VITE_API_URL`; production deployments must set it correctly.
- The backend requires a reachable MongoDB Atlas cluster.
- Cloudinary configuration exists, but image upload workflows are not a primary documented feature.
- Integration and end-to-end tests are not yet implemented.

## Future Improvements

- Rename the GitHub repository to `get-jacked-coach`
- Add a full screenshot set under a dedicated `docs/images/` directory
- Add API integration tests with a test database
- Add frontend component or route tests
- Add a password reset flow
- Add stronger token storage for production
- Add automated dependency/security scanning in CI

## Recommended GitHub Metadata

Suggested repository description:

```text
MERN strength-training app with adaptive weekly programs, workout history, analytics, templates, and coach insights.
```

Suggested topics:

```text
mern, react, vite, express, mongodb, mongoose, jwt-authentication, fitness, strength-training, tailwindcss
```
