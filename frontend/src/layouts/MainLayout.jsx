import { motion } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar.jsx';
import Footer from '../components/Footer/Footer.jsx';

function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}

export default MainLayout;
