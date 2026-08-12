import { motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar.jsx';
import Footer from '../components/Footer/Footer.jsx';
import DecorativeBackground from '../components/DecorativeBackground/DecorativeBackground.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function MainLayout() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const isLightDashboard = isAuthenticated && pathname === '/dashboard';

  return (
    <div className={`relative flex min-h-screen flex-col overflow-x-hidden ${isLightDashboard ? 'bg-[#f4f3ee] text-[#181a18]' : 'text-[#f5f5f2]'}`}>
      {isAuthenticated && !isLightDashboard && <DecorativeBackground />}
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`relative z-10 mx-auto w-full flex-1 px-4 py-8 sm:px-6 lg:px-8 ${isLightDashboard ? 'max-w-6xl' : 'max-w-7xl'}`}
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}

export default MainLayout;
