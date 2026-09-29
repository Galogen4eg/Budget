import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a modal or overlay is active,
 * compensating for scrollbar width to prevent horizontal layout jumps/flicker.
 *
 * @param isLocked Whether the body scroll should be locked (defaults to true)
 */
export function useBodyScrollLock(isLocked: boolean = true): void {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
