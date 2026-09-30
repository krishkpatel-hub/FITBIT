import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import AppSectionLayout from './layouts/AppSectionLayout.jsx';
import { appPaths, legacyPaths, resolveLegacyPath } from './utils/navigation';
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
const Coach = lazy(() => import('./pages/Coach/Coach.jsx'));

function LegacyRedirect() {
  const location = useLocation();
  return <Navigate replace to={`${resolveLegacyPath(location.pathname, location.search)}${location.hash}`} state={location.state} />;
}

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          {Object.keys(legacyPaths).map((path) => <Route key={path} path={path} element={<LegacyRedirect />} />)}
          <Route path={appPaths.home} element={<Dashboard />} />
          <Route element={<AppSectionLayout section="Program" />}>
            <Route path={appPaths.program} element={<StrengthProgram />} />
            <Route path={appPaths.calendar} element={<Calendar />} />
          </Route>
          <Route element={<AppSectionLayout section="Train" />}>
            <Route path={appPaths.train} element={<Progress activeSection="log-workout" />} />
            <Route path={appPaths.templates} element={<Templates />} />
          </Route>
          <Route element={<AppSectionLayout section="Progress" />}>
            <Route path={appPaths.progress} element={<Progress activeSection="overview" />} />
            <Route path={appPaths.history} element={<Progress activeSection="training-history" />} />
            <Route path={appPaths.prs} element={<Progress activeSection="log-pr" />} />
            <Route path={appPaths.body} element={<Progress activeSection="body-metrics" />} />
            <Route
              path={appPaths.analytics}
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Analytics />
                </Suspense>
              }
            />
          </Route>
          <Route
            path={appPaths.coach}
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Coach />
              </Suspense>
            }
          />
          <Route path={appPaths.profile} element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
