import { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

const DOT_SIZE = 6;
const RING_SIZE = 32;
const TRAIL_LERP = 0.14;

const interactiveSelector = [
  'a',
  'button',
  '[role="button"]',
  '[data-cursor="interactive"]',
  'summary',
  'label',
  'select',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="range"]',
].join(', ');

const nativeControlSelector = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"])',
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(', ');

function CustomCursor() {
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const ringPositionRef = useRef(null);
  const frameRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const ringCoordinatesRef = useRef({ x: 0, y: 0 });
  const hasPointerRef = useRef(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const finePointerQuery = window.matchMedia('(pointer: fine) and (hover: hover)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let mounted = true;

    const canEnable = () => finePointerQuery.matches && !reducedMotionQuery.matches;

    const syncEnabled = () => {
      if (!mounted) return;
      setEnabled(canEnable());
    };

    syncEnabled();
    finePointerQuery.addEventListener('change', syncEnabled);
    reducedMotionQuery.addEventListener('change', syncEnabled);

    return () => {
      mounted = false;
      finePointerQuery.removeEventListener('change', syncEnabled);
      reducedMotionQuery.removeEventListener('change', syncEnabled);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove('custom-cursor-enabled');
      return undefined;
    }

    const cursor = cursorRef.current;
    const dot = dotRef.current;
    const ringPosition = ringPositionRef.current;

    if (!cursor || !dot || !ringPosition) {
      return undefined;
    }

    document.body.classList.add('custom-cursor-enabled');

    const setVisible = (visible) => {
      cursor.classList.toggle('custom-cursor--hidden', !visible);
    };

    const setInteractive = (target) => {
      const element = target instanceof Element ? target : null;
      const isNativeControl = Boolean(element?.closest(nativeControlSelector));
      const isInteractive = Boolean(element?.closest(interactiveSelector));

      cursor.classList.toggle('custom-cursor--interactive', isInteractive && !isNativeControl);
      cursor.classList.toggle('custom-cursor--native-control', isNativeControl);
    };

    const handlePointerMove = (event) => {
      pointerRef.current.x = event.clientX;
      pointerRef.current.y = event.clientY;

      if (!hasPointerRef.current) {
        ringCoordinatesRef.current.x = event.clientX;
        ringCoordinatesRef.current.y = event.clientY;
        hasPointerRef.current = true;
      }

      setVisible(true);
      setInteractive(event.target);
    };

    const handlePointerDown = () => {
      cursor.classList.add('custom-cursor--pressed');
    };

    const handlePointerUp = () => {
      cursor.classList.remove('custom-cursor--pressed');
    };

    const handlePointerLeave = () => {
      setVisible(false);
      cursor.classList.remove('custom-cursor--pressed');
    };

    const animate = () => {
      const pointer = pointerRef.current;
      const ringCoordinates = ringCoordinatesRef.current;

      ringCoordinates.x += (pointer.x - ringCoordinates.x) * TRAIL_LERP;
      ringCoordinates.y += (pointer.y - ringCoordinates.y) * TRAIL_LERP;

      dot.style.transform = `translate3d(${pointer.x - DOT_SIZE / 2}px, ${pointer.y - DOT_SIZE / 2}px, 0)`;
      ringPosition.style.transform = `translate3d(${ringCoordinates.x - RING_SIZE / 2}px, ${ringCoordinates.y - RING_SIZE / 2}px, 0)`;

      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    document.documentElement.addEventListener('pointerenter', handlePointerMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      document.documentElement.removeEventListener('pointerenter', handlePointerMove);
      document.body.classList.remove('custom-cursor-enabled');
      cursor.classList.remove('custom-cursor--interactive', 'custom-cursor--native-control', 'custom-cursor--pressed');
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div ref={cursorRef} className="custom-cursor custom-cursor--hidden" aria-hidden="true">
      <div ref={dotRef} className="custom-cursor__dot" />
      <div ref={ringPositionRef} className="custom-cursor__ring-position">
        <div className="custom-cursor__ring-visual" />
      </div>
    </div>
  );
}

export { DOT_SIZE, RING_SIZE, TRAIL_LERP };
export default CustomCursor;
