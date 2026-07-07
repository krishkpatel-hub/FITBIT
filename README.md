# FitBit-Strength

FitBit-Strength is a MERN fitness project foundation built with React, Vite, TailwindCSS, Node.js, Express, MongoDB Atlas, JWT, and Axios.

This scaffold is intentionally simple: it includes the folder structure, starter configuration, placeholder pages/components, backend routes, MongoDB connection setup, and separate frontend/backend run scripts.

## Project Structure

```text
FitBit-Strength/
  frontend/
  backend/
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas connection string

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:3000`.

Environment variables are stored in `backend/.env`:

```env
PORT=3000
MONGO_URI=mongodb+srv://krishkpatel1978_db_user:12345@cluster1.xqyd1sm.mongodb.net/fitbit_strength?retryWrites=true&w=majority
JWT_SECRET=fitbitstrength_jwt_secret_2026
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

Axios is configured in `frontend/src/services/axios.js` with a default API base URL of `http://localhost:3000/api`.

## Available Scripts

Backend:

```bash
npm run dev
npm start
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

## Current Status

- Project foundation only
- Placeholder frontend pages and components
- Basic Express app and API route modules
- MongoDB connection utility
- JWT token utility
- Mongoose model shells
- Ready for feature implementation later

