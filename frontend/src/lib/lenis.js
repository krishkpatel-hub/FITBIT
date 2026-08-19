// Small singleton so any component (nav links, anchor buttons, etc.) can trigger a
// smoothed scroll through the single Lenis instance owned by <SmoothScroll />,
// without needing React context or prop drilling.
let lenisInstance = null;

export function setLenisInstance(instance) {
  lenisInstance = instance;
}

export function getLenisInstance() {
  return lenisInstance;
}

/**
 * Scroll to a target (selector string, element, or offset) using the active Lenis
 * instance when smooth scrolling is enabled, falling back to native scrollIntoView
 * (touch devices, prefers-reduced-motion, or before Lenis has mounted).
 */
export function smoothScrollTo(target, options = {}) {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (lenisInstance && !prefersReducedMotion) {
    lenisInstance.scrollTo(target, { offset: 0, ...options });
    return;
  }

  const element = typeof target === 'string' ? document.querySelector(target) : target;

  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
}
