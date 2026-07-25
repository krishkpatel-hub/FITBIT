import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { appNavigationLinks } from '../../utils/navigation.js';
import Logo from '../Logo.jsx';

const landingLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Product', href: '#product' },
];

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isLandingPage = !isAuthenticated && pathname === '/';

  const handleAnchorClick = (event, href) => {
    event.preventDefault();
    setIsMenuOpen(false);

    const target = document.querySelector(href);
    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const publicNav = (
    <>
      {isLandingPage &&
        landingLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(event) => handleAnchorClick(event, link.href)}
            className="rounded-lg px-3 py-2 text-[#a5aaa6] hover:bg-[#151816] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d6b94c]/70"
          >
            {link.label}
          </a>
        ))}
      <Link
        to="/login"
        onClick={() => setIsMenuOpen(false)}
        className="rounded-lg px-3 py-2 text-[#a5aaa6] hover:bg-[#151816] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d6b94c]/70"
      >
        Login
      </Link>
      <Link
        to="/register"
        onClick={() => setIsMenuOpen(false)}
        className="rounded-lg bg-[#d6b94c] px-3 py-2 font-semibold text-[#090a09] hover:bg-[#e0c762] focus:outline-none focus:ring-2 focus:ring-[#d6b94c]/70 focus:ring-offset-2 focus:ring-offset-[#090a09]"
      >
        Start Free
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[#292d2a] bg-[#090a09]/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0 focus:outline-none focus:ring-2 focus:ring-[#d6b94c]/70">
          <Logo />
        </Link>
        <div className="hidden max-w-full flex-wrap items-center gap-1 text-sm font-medium md:flex">
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
            publicNav
          )}
        </div>
        <button
          type="button"
          className="inline-flex rounded-lg border border-[#292d2a] px-3 py-2 text-sm font-medium text-[#f4f4f0] hover:bg-[#151816] focus:outline-none focus:ring-2 focus:ring-[#d6b94c]/70 md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          Menu
        </button>
      </nav>
      {isMenuOpen && (
        <div id="mobile-navigation" className="border-t border-[#292d2a] bg-[#090a09] px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm font-medium">
            {isAuthenticated
              ? appNavigationLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? 'rounded-lg border border-[#292d2a] bg-[#151816] px-3 py-2 text-[#f4f4f0]'
                        : 'rounded-lg px-3 py-2 text-[#a5aaa6] hover:bg-[#151816] hover:text-[#f4f4f0]'
                    }
                  >
                    {link.label}
                  </NavLink>
                ))
              : publicNav}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                }}
                className="rounded-lg border border-[#292d2a] px-3 py-2 text-left text-[#a5aaa6] hover:bg-[#151816] hover:text-[#f4f4f0]"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
