import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { appNavigationLinks } from '../../utils/navigation';
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
  const navLinkClass = 'nav-link';
  const activeNavLinkClass = 'nav-link-active';

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
            className={navLinkClass}
          >
            {link.label}
          </a>
        ))}
      <Link
        to="/login"
        onClick={() => setIsMenuOpen(false)}
        className={navLinkClass}
      >
        Login
      </Link>
      <Link
        to="/register"
        onClick={() => setIsMenuOpen(false)}
        className="btn-primary min-h-0 px-3 py-2"
      >
        Start Free
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[#d8d6cf] bg-[#faf9f6]/92 backdrop-blur-xl supports-[backdrop-filter]:bg-[#faf9f6]/86">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f4f46]/40">
          <Logo tone="light" />
        </Link>
        <div className="hidden max-w-full flex-wrap items-center gap-1 text-sm font-medium md:flex">
          {isAuthenticated &&
            appNavigationLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive
                    ? activeNavLinkClass
                    : navLinkClass
                }
              >
                {link.label}
              </NavLink>
            ))}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className={navLinkClass}
            >
              Logout
            </button>
          ) : (
            publicNav
          )}
        </div>
        <button
          type="button"
          className="btn-secondary min-h-0 px-3 py-2 md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          Menu
        </button>
      </nav>
      {isMenuOpen && (
        <div id="mobile-navigation" className="border-t border-[#d8d6cf] bg-[#faf9f6] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.12)] md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm font-medium">
            {isAuthenticated
              ? appNavigationLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? activeNavLinkClass
                        : navLinkClass
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
                className={`${navLinkClass} text-left`}
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
