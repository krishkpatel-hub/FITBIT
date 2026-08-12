import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../Logo.jsx';

const scrollLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Product Preview', href: '#product' },
];

function Footer() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const isLandingPage = !isAuthenticated && pathname === '/';
  const currentYear = new Date().getFullYear();

  if (isLandingPage) {
    return (
      <footer className="border-t border-[#D2CFC7] bg-[#EEECE5]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <Logo tone="light" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#4F534E]">
              Adaptive strength programming, workout tracking, and progress tools for lifters.
            </p>
          </div>

          <nav aria-label="Product footer navigation">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#747872]">Product</h2>
            <div className="mt-4 space-y-3 text-sm">
              {scrollLinks.map((link) => (
                <a key={link.href} href={link.href} className="block text-[#4F534E] hover:text-[#151714]">
                  {link.label}
                </a>
              ))}
            </div>
          </nav>

          <nav aria-label="Account footer navigation">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#747872]">Account</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Link to="/login" className="block text-[#4F534E] hover:text-[#151714]">
                Login
              </Link>
              <Link to="/register" className="block text-[#4F534E] hover:text-[#151714]">
                Create Account
              </Link>
            </div>
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#747872]">Legal</h2>
            <div className="mt-4 space-y-3 text-sm">
              {/* TODO: Link these labels when Privacy and Terms routes are implemented. */}
              <span className="block text-[#747872]">Privacy</span>
              <span className="block text-[#747872]">Terms</span>
            </div>
          </div>
        </div>
        <div className="border-t border-[#D2CFC7]">
          <div className="mx-auto max-w-7xl px-4 py-5 text-sm text-[#747872] sm:px-6 lg:px-8">
            © {currentYear} GetJackedCoach. All rights reserved.
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-[#D2CFC7] bg-[#EEECE5]">
      <div className="mx-auto max-w-7xl px-4 py-5 text-sm text-[#747872] sm:px-6 lg:px-8">
        © {currentYear} GetJackedCoach. Built for strength tracking.
      </div>
    </footer>
  );
}

export default Footer;
