import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useMotionEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const motionQuery = '(prefers-reduced-motion: reduce)';
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(motionQuery).matches);
  useEffect(() => {
    const media = typeof window !== 'undefined' && window.matchMedia?.(motionQuery);
    if (!media) return;
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Cancel interrupted frames, continue from the displayed value, and expose the final value to SSR. */
export function useAnimatedNumber(value, { animate = true, duration = 700, from = 0, resetKey } = {}) {
  const target = Number.isFinite(value) ? value : 0;
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(target);
  const current = useRef(target);
  const previous = useRef({ enabled: false, key: resetKey });
  useMotionEffect(() => {
    const milliseconds = Number.isFinite(duration) ? Math.min(2000, Math.max(0, duration)) : 700;
    const enabled = animate && !reduced && milliseconds > 0 && typeof requestAnimationFrame === 'function';
    const start = !previous.current.enabled || previous.current.key !== resetKey ? from : current.current;
    previous.current = { enabled, key: resetKey };
    const update = number => { current.current = number; setDisplayed(number); };
    if (!enabled || start === target) { update(target); return; }
    update(start);
    const began = performance.now();
    let frame, cancelled = false;
    function tick(now) {
      if (cancelled) return;
      const progress = Math.max(0, Math.min(1, (now - began) / milliseconds));
      update(progress === 1 ? target : start + (target - start) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [target, animate, reduced, duration, from, resetKey]);
  return animate && !reduced ? displayed : target;
}
