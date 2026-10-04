import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { appNavigationLinks, appPaths } from '../../utils/navigation';
import { smoothScrollTo } from '../../lib/lenis.js';
import Logo from '../Logo.jsx';

const landingLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Product', href: '#product' },
];

function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const accountButtonRef = useRef(null);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const initials = `${user?.firstName?.[0] || user?.username?.[0] || 'A'}${user?.lastName?.[0] || ''}`.toUpperCase();

  useEffect(() => {
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  }, [pathname, isAuthenticated]);

  useEffect(() => {
    const dismiss = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        if (isAccountOpen) accountButtonRef.current?.focus();
        else if (isMenuOpen) menuButtonRef.current?.focus();
        setIsAccountOpen(false);
        setIsMenuOpen(false);
      } else if (event.type === 'pointerdown') {
        if (!accountRef.current?.contains(event.target)) setIsAccountOpen(false);
        if (!menuRef.current?.contains(event.target) && !menuButtonRef.current?.contains(event.target)) {
          setIsMenuOpen(false);
        }
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [isAccountOpen, isMenuOpen]);
  const isLandingPage = !isAuthenticated && pathname === '/';
  const navLinkClass = 'nav-link';
  const activeNavLinkClass = 'nav-link-active';
  const desktopNavClass = isLandingPage
    ? 'hidden max-w-full flex-wrap items-center gap-2 text-[13px] font-medium lg:gap-3 md:flex'
    : `hidden max-w-full flex-wrap items-center gap-1 text-sm font-medium ${isAuthenticated ? 'lg:flex' : 'md:flex'}`;

  const handleAnchorClick = (event, href) => {
    event.preventDefault();
    setIsMenuOpen(false);
    smoothScrollTo(href);
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
    <header className="sticky top-0 z-30 border-b border-[#D2CFC7] bg-[#FAF9F6]">
      <nav aria-label="Primary navigation" className={`mx-auto flex max-w-[1240px] items-center justify-between py-[18px] sm:px-6 lg:px-8 ${isAuthenticated ? 'gap-3 px-4' : 'gap-4 px-5'}`}>
        <Link to={isAuthenticated ? appPaths.home : '/'} className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f4f46]/40">
          <Logo tone="light" />
        </Link>
        <div className={desktopNavClass}>
          {isAuthenticated &&
            appNavigationLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  isActive
                    ? activeNavLinkClass
                    : navLinkClass
                }
              >
                {link.label}
              </NavLink>
            ))}
          {!isAuthenticated && publicNav}
        </div>
        <div className={`items-center gap-2 ${isAuthenticated ? 'flex' : 'flex md:hidden'}`}>
          <button
            ref={menuButtonRef}
            type="button"
            className={`btn-secondary px-3 ${isAuthenticated ? 'lg:hidden' : 'md:hidden'}`}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => { setIsMenuOpen((current) => !current); setIsAccountOpen(false); }}
          >
            Menu
          </button>
          {isAuthenticated && (
            <div ref={accountRef} className="relative" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsAccountOpen(false);
            }}>
              <button
                ref={accountButtonRef}
                type="button"
                aria-label="Account"
                aria-expanded={isAccountOpen}
                aria-controls="account-navigation"
                onClick={() => { setIsAccountOpen((current) => !current); setIsMenuOpen(false); }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#CBCFC8] bg-[#E6E9E1] text-sm font-semibold text-[#203b33]"
              >{initials}</button>
              {isAccountOpen && (
                <nav id="account-navigation" aria-label="Account" className="absolute right-0 top-12 w-48 rounded-lg border border-[#D2CFC7] bg-[#FAF9F6] p-2 shadow-sm">
                  <NavLink to={appPaths.profile} className="nav-link block w-full" onClick={() => setIsAccountOpen(false)}>Profile</NavLink>
                  <button type="button" className="nav-link w-full text-left" onClick={() => { setIsAccountOpen(false); logout(); }}>Logout</button>
                </nav>
              )}
            </div>
          )}
        </div>
      </nav>
      {isMenuOpen && (
        <div ref={menuRef} id="mobile-navigation" className={`max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-[#D2CFC7] bg-[#FAF9F6] px-4 py-3 ${isAuthenticated ? 'lg:hidden' : 'md:hidden'}`}>
          <nav aria-label="Mobile primary navigation" className="mx-auto flex max-w-7xl flex-col gap-1 text-sm font-medium">
            {isAuthenticated
              ? appNavigationLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? `${activeNavLinkClass} w-full`
                        : `${navLinkClass} w-full`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))
              : publicNav}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
