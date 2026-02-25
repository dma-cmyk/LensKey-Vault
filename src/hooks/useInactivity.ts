import { useEffect, useCallback, useRef } from 'react';

export function useInactivity(onInactivity: () => void, timeoutMs: number = 5 * 60 * 1000) {
  const timerRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      onInactivity();
    }, timeoutMs);
  }, [onInactivity, timeoutMs]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);
}
