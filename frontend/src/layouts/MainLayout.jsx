import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar.jsx';
import Footer from '../components/Footer/Footer.jsx';
import DecorativeBackground from '../components/DecorativeBackground/DecorativeBackground.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function MainLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden text-stone-100">
      {isAuthenticated && <DecorativeBackground />}
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}

export default MainLayout;
