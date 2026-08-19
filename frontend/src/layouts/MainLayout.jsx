import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar.jsx';
import Footer from '../components/Footer/Footer.jsx';
import CustomCursor from '../components/CustomCursor/CustomCursor.jsx';
import SmoothScroll from '../components/SmoothScroll/SmoothScroll.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function MainLayout() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const isPublicLandingPage = !isAuthenticated && pathname === '/';

  useEffect(() => {
    document.body.classList.add('app-light-shell');

    return () => {
      document.body.classList.remove('app-light-shell');
    };
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#EEECE5] text-[#151714]">
      <SmoothScroll />
      <CustomCursor />
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`relative z-10 mx-auto w-full flex-1 ${
          isPublicLandingPage
            ? 'max-w-none px-0 py-0'
            : `px-4 py-8 sm:px-6 lg:px-8 ${isAuthenticated && pathname === '/dashboard' ? 'max-w-6xl' : 'max-w-7xl'}`
        }`}
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}

export default MainLayout;
