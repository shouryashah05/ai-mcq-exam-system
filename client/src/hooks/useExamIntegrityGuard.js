import { useEffect, useRef } from 'react';

export default function useExamIntegrityGuard({ enabled, onWarning, onViolation, beforeUnloadMessage, maxWarnings = 1 }) {
  const onWarningRef = useRef(onWarning);
  const onViolationRef = useRef(onViolation);
  const triggeredRef = useRef(false);
  const warningCountRef = useRef(0);
  const lastIntegrityEventAtRef = useRef(0);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    if (!enabled) {
      triggeredRef.current = false;
      warningCountRef.current = 0;
      lastIntegrityEventAtRef.current = 0;
      return undefined;
    }

    const recordIntegrityEvent = () => {
      if (triggeredRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastIntegrityEventAtRef.current < 1000) {
        return;
      }

      lastIntegrityEventAtRef.current = now;

      warningCountRef.current += 1;

      if (warningCountRef.current <= maxWarnings) {
        Promise.resolve(onWarningRef.current?.(warningCountRef.current)).catch(() => {
          warningCountRef.current = Math.max(0, warningCountRef.current - 1);
        });
        return;
      }

      triggeredRef.current = true;
      Promise.resolve(onViolationRef.current?.()).catch(() => {
        triggeredRef.current = false;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') {
        return;
      }

      recordIntegrityEvent();
    };

    const handleWindowBlur = () => {
      if (document.visibilityState === 'hidden' || typeof document.hasFocus !== 'function' || !document.hasFocus()) {
        recordIntegrityEvent();
      }
    };

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = beforeUnloadMessage || 'Leaving this page will end your exam attempt.';
      return event.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [beforeUnloadMessage, enabled, maxWarnings]);
}