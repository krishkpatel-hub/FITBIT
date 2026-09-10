import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://getjackedcoach.com').replace(/\/$/, '');

const routeMeta = {
  '/': {
    title: 'GetJackedCoach | Strength Training & Workout Progress',
    description:
      'Build structured strength programs, log workouts, track progress, and understand your training with GetJackedCoach.',
    canonicalPath: '/',
    robots: 'index,follow',
  },
  '/login': {
    title: 'Login | GetJackedCoach',
    description: 'Sign in to GetJackedCoach.',
    robots: 'noindex,nofollow',
  },
  '/register': {
    title: 'Create Account | GetJackedCoach',
    description: 'Create your GetJackedCoach account.',
    robots: 'noindex,nofollow',
  },
};

const defaultPrivateMeta = {
  title: 'GetJackedCoach',
  description: 'Private GetJackedCoach training workspace.',
  robots: 'noindex,nofollow',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'GetJackedCoach',
      url: `${siteUrl}/`,
      description:
        'A strength-training platform for structured programs, workout logging, progress tracking, and contextual coaching.',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#software`,
      name: 'GetJackedCoach',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      url: `${siteUrl}/`,
      description:
        'GetJackedCoach helps lifters generate weekly strength programming from training maxes, log workouts, track personal records, and review progress.',
    },
  ],
};

const setMeta = (selector, attribute, value) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    const match = selector.match(/\[(name|property)="([^"]+)"\]/);

    if (match) {
      element.setAttribute(match[1], match[2]);
    }

    document.head.appendChild(element);
  }

  element.setAttribute(attribute, value);
};

const setCanonical = (href) => {
  let canonical = document.head.querySelector('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }

  canonical.setAttribute('href', href);
};

const setStructuredData = () => {
  let script = document.head.querySelector('#getjackedcoach-jsonld');

  if (!script) {
    script = document.createElement('script');
    script.id = 'getjackedcoach-jsonld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(structuredData);
};

function SEO() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = routeMeta[pathname] || defaultPrivateMeta;
    const canonicalPath = meta.canonicalPath || pathname;
    const canonicalUrl = `${siteUrl}${canonicalPath === '/' ? '/' : canonicalPath}`;
    const ogImage = `${siteUrl}/og-image.png`;

    document.title = meta.title;
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('meta[name="robots"]', 'content', meta.robots);
    setCanonical(canonicalUrl);

    setMeta('meta[property="og:type"]', 'content', 'website');
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:site_name"]', 'content', 'GetJackedCoach');
    setMeta('meta[property="og:title"]', 'content', pathname === '/' ? 'GetJackedCoach' : meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:image"]', 'content', ogImage);
    setMeta('meta[property="og:image:secure_url"]', 'content', ogImage);
    setMeta('meta[property="og:image:type"]', 'content', 'image/png');
    setMeta('meta[property="og:image:width"]', 'content', '1200');
    setMeta('meta[property="og:image:height"]', 'content', '630');
    setMeta('meta[property="og:image:alt"]', 'content', 'GetJackedCoach adaptive strength programming platform');

    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', pathname === '/' ? 'GetJackedCoach' : meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);
    setMeta('meta[name="twitter:image"]', 'content', ogImage);

    if (pathname === '/') {
      setStructuredData();
    } else {
      document.head.querySelector('#getjackedcoach-jsonld')?.remove();
    }
  }, [pathname]);

  return null;
}

export default SEO;
