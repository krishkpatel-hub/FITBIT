import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { setLenisInstance } from '../../lib/lenis.js';

// Premium, slightly-eased feel (Linear.app / Apple product pages) without reading sluggish.
const LENIS_DURATION = 1.1;
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

// Renders nothing: this is purely a controller that drives the document's native
// scroll position through Lenis, so sticky/fixed elements, IntersectionObserver,
// getBoundingClientRect, and scrollIntoView all keep working exactly as before.
function SmoothScroll() {
  const { pathname } = useLocation();
  const lenisRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Touch/tablet and prefers-reduced-motion: reduce keep fully native scrolling —
    // don't even instantiate Lenis so there is zero listener/RAF overhead there.
    if (coarsePointerQuery.matches || reducedMotionQuery.matches) {
      return undefined;
    }

    const lenis = new Lenis({
      duration: LENIS_DURATION,
      easing: easeOutExpo,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
    });

    lenisRef.current = lenis;
    setLenisInstance(lenis);

    let rafId = window.requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      setLenisInstance(null);
    };
  }, []);

  useEffect(() => {
    // Route changes should land at the top instantly (no eased glide, no stale
    // Lenis-tracked position left over from the previous page).
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

export default SmoothScroll;
