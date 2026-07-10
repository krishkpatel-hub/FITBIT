import { NavLink } from 'react-router-dom';
import { appNavigationLinks } from '../../utils/navigation.js';

function Sidebar() {
  return (
    <aside className="quiet-card" aria-label="App navigation">
      <h2 className="font-semibold text-stone-100">FitBit-Strength</h2>
      <nav className="mt-4 grid gap-1">
        {appNavigationLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive
                ? 'rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-50'
                : 'rounded-md px-3 py-2 text-sm font-medium text-stone-400 hover:bg-stone-900/70 hover:text-stone-100'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
