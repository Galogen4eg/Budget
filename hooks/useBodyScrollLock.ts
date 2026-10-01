import { useEffect } from 'react';

// Reference counter and cached styles for nested modal support
let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * Custom hook to lock body scrolling when a modal or overlay is active,
 * compensating for scrollbar width to prevent horizontal layout jumps/flicker.
 * Uses reference counting so nested modals safely keep scroll locked.
 *
 * @param isLocked Whether the body scroll should be locked (defaults to true)
 */
export function useBodyScrollLock(isLocked: boolean = true): void {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
