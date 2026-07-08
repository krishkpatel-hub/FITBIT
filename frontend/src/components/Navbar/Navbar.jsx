import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/strength-program', label: 'Strength Program' },
  { to: '/workout', label: 'Workout' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/progress', label: 'Progress' },
  { to: '/profile', label: 'Profile' },
];

function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-xl font-bold tracking-tight text-white">
          FitBit-Strength
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {isAuthenticated &&
            links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive
                    ? 'rounded-md bg-emerald-950/400/10 px-3 py-2 text-emerald-300'
                    : 'rounded-md px-3 py-2 text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }
              >
                {link.label}
              </NavLink>
            ))}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-md bg-slate-800 px-3 py-2 text-slate-50 hover:bg-slate-900/80"
            >
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white">
                Login
              </Link>
              <Link to="/register" className="rounded-md bg-emerald-950/400 px-3 py-2 text-slate-50 hover:bg-emerald-400">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
