import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../Logo.jsx';

function Footer() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const isLandingPage = !isAuthenticated && pathname === '/';
  const currentYear = new Date().getFullYear();

  if (isLandingPage) {
    return (
      <footer className="border-t border-[#D2CFC7] bg-[#EEECE5]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <Logo tone="light" />
          <p className="text-sm text-[#747872]">© {currentYear} GetJackedCoach. Built for stronger training.</p>
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
