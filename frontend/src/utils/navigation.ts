export interface NavigationLink {
  to: string;
  label: string;
}

export const appNavigationLinks: NavigationLink[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/strength-program', label: 'Strength Program' },
  { to: '/templates', label: 'Templates' },
  { to: '/progress', label: 'Progress' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/coach', label: 'Coach' },
  { to: '/profile', label: 'Profile' },
];
