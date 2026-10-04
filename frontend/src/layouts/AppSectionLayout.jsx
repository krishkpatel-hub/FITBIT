import { NavLink, Outlet } from 'react-router-dom';
import { sectionNavigation } from '../utils/navigation';

export default function AppSectionLayout({ section }) {
  return (
    <div className="min-w-0">
      <nav aria-label={`${section} sections`} className="mb-8 flex gap-5 overflow-x-auto border-b border-[#D2CFC7] sm:gap-6">
        {sectionNavigation[section].map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-2 text-sm font-semibold ${isActive ? 'border-[#2f4f46] text-[#203b33]' : 'border-transparent text-[#62675f] hover:text-[#151714]'}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
