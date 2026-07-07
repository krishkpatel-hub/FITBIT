import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/workout', label: 'Workout' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/progress', label: 'Progress' },
  { to: '/profile', label: 'Profile' },
];

function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="text-xl font-bold text-emerald-700">
          FitBit-Strength
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          {isAuthenticated &&
            links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? 'text-emerald-700' : 'text-slate-600 hover:text-emerald-700'
                }
              >
                {link.label}
              </NavLink>
            ))}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-md bg-slate-900 px-3 py-2 text-white hover:bg-slate-700"
            >
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-emerald-700">
                Login
              </Link>
              <Link to="/register" className="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700">
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

