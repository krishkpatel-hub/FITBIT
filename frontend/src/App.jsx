import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner.jsx';
import Home from './pages/Home/Home.jsx';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import StrengthProgram from './pages/StrengthProgram/StrengthProgram.jsx';
import Templates from './pages/Templates/Templates.jsx';
import Calendar from './pages/Calendar/Calendar.jsx';
import Progress from './pages/Progress/Progress.jsx';
import Profile from './pages/Profile/Profile.jsx';
import NotFound from './pages/NotFound/NotFound.jsx';

const Analytics = lazy(() => import('./pages/Analytics/Analytics.jsx'));
const PRCenter = lazy(() => import('./pages/PRCenter/PRCenter.jsx'));
const Coach = lazy(() => import('./pages/Coach/Coach.jsx'));

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/analytics"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Analytics />
              </Suspense>
            }
          />
          <Route
            path="/coach"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Coach />
              </Suspense>
            }
          />
          <Route path="/strength-program" element={<StrengthProgram />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/progress" element={<Progress />} />
          <Route
            path="/prs"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <PRCenter />
              </Suspense>
            }
          />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
