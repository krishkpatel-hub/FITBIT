export interface NavigationLink {
  to: string;
  label: string;
}

export const appNavigationLinks: NavigationLink[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/strength-program', label: 'Strength Program' },
  { to: '/progress', label: 'Progress' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/prs', label: 'PRs' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/coach', label: 'Coach' },
  { to: '/templates', label: 'Templates' },
  { to: '/profile', label: 'Profile' },
];
