import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { appNavigationLinks } from '../../utils/navigation.js';

function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-[#292d2a] bg-[#090a09]/95">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-semibold tracking-[-0.02em] text-[#f4f4f0]">
          FitBit-Strength
        </Link>
        <div className="flex max-w-full flex-wrap items-center gap-1 text-sm font-medium">
          {isAuthenticated &&
            appNavigationLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive
                    ? 'rounded-lg border border-[#292d2a] bg-[#151816] px-3 py-2 text-[#f4f4f0]'
                    : 'rounded-lg px-3 py-2 text-[#a5aaa6] hover:bg-[#151816] hover:text-[#f4f4f0]'
                }
              >
                {link.label}
              </NavLink>
            ))}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-[#292d2a] px-3 py-2 text-[#a5aaa6] hover:bg-[#151816] hover:text-[#f4f4f0]"
            >
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-[#a5aaa6] hover:bg-[#151816] hover:text-white">
                Login
              </Link>
              <Link to="/register" className="rounded-lg bg-[#d6b94c] px-3 py-2 text-[#090a09] hover:bg-[#e0c762]">
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
