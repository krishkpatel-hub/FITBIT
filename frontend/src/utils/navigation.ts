export interface NavigationLink {
  to: string;
  label: string;
  end?: boolean;
}

export const appPaths = {
  home: '/app',
  program: '/app/program',
  calendar: '/app/program/calendar',
  train: '/app/train',
  templates: '/app/train/templates',
  progress: '/app/progress',
  overview: '/app/progress',
  history: '/app/progress/history',
  prs: '/app/progress/prs',
  body: '/app/progress/body',
  analytics: '/app/progress/analytics',
  coach: '/app/coach',
  profile: '/app/profile',
} as const;

export const appNavigationLinks: NavigationLink[] = [
  { to: appPaths.home, label: 'Home', end: true },
  { to: appPaths.program, label: 'Program' },
  { to: appPaths.train, label: 'Train' },
  { to: appPaths.progress, label: 'Progress' },
  { to: appPaths.coach, label: 'Coach' },
];

export const sectionNavigation: Record<string, NavigationLink[]> = {
  Program: [
    { to: appPaths.program, label: 'Program', end: true },
    { to: appPaths.calendar, label: 'Calendar' },
  ],
  Train: [
    { to: appPaths.train, label: 'Start Workout', end: true },
    { to: appPaths.templates, label: 'Templates' },
  ],
  Progress: [
    { to: appPaths.overview, label: 'Overview', end: true },
    { to: appPaths.history, label: 'History' },
    { to: appPaths.prs, label: 'PRs' },
    { to: appPaths.body, label: 'Body' },
    { to: appPaths.analytics, label: 'Analytics' },
  ],
};

export const progressSectionPaths: Record<string, string> = {
  overview: appPaths.overview,
  'log-workout': appPaths.train,
  'log-pr': appPaths.prs,
  'training-history': appPaths.history,
  'body-metrics': appPaths.body,
  'strength-progress': appPaths.overview,
};

export const legacyPaths: Record<string, string> = {
  '/dashboard': appPaths.home,
  '/strength-program': appPaths.program,
  '/calendar': appPaths.calendar,
  '/templates': appPaths.templates,
  '/analytics': appPaths.analytics,
  '/coach': appPaths.coach,
  '/profile': appPaths.profile,
  '/prs': appPaths.prs,
  '/progress': appPaths.train,
};

export function resolveLegacyPath(pathname: string, search: string): string {
  if (pathname !== '/progress') return `${legacyPaths[pathname] || appPaths.home}${search}`;
  const params = new URLSearchParams(search);
  const destination = progressSectionPaths[params.get('section') || 'log-workout'] || appPaths.train;
  params.delete('section');
  const remaining = params.toString();
  return `${destination}${remaining ? `?${remaining}` : ''}`;
}
