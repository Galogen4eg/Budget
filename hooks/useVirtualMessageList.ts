import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseVirtualMessageListOptions {
  itemCount: number;
  containerRef: React.RefObject<HTMLElement | null>;
  estimatedItemHeight?: number;
  overscan?: number;
  threshold?: number;
}

export interface VirtualMessageListResult {
  isVirtual: boolean;
  virtualItems: { index: number }[];
  startIndex: number;
  endIndex: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
}

const DEFAULT_ESTIMATED_HEIGHT = 78;
const DEFAULT_OVERSCAN = 25;
export const CHAT_VIRTUALIZATION_THRESHOLD = 500;

/**
 * useVirtualMessageList:
 * Conditionally activates windowed virtualization when message count exceeds threshold (500 items).
 * For lists under threshold, returns full dataset with 0 spacers and 0 RAF overhead.
 */
export function useVirtualMessageList({
  itemCount,
  containerRef,
  estimatedItemHeight = DEFAULT_ESTIMATED_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  threshold = CHAT_VIRTUALIZATION_THRESHOLD,
}: UseVirtualMessageListOptions): VirtualMessageListResult {
  const isVirtual = itemCount > threshold;

  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    viewportHeight: 600,
  });

  const rafId = useRef<number | null>(null);

  const updateScroll = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setScrollState({
      scrollTop: el.scrollTop,
      viewportHeight: el.clientHeight || 600,
    });
  }, [containerRef]);

  const handleScroll = useCallback(() => {
    if (!isVirtual || !containerRef.current) return;

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(updateScroll);
  }, [isVirtual, containerRef, updateScroll]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isVirtual) return;

    updateScroll();

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isVirtual, containerRef, handleScroll, updateScroll]);

  if (!isVirtual) {
    const fullItems: { index: number }[] = [];
    for (let i = 0; i < itemCount; i++) {
      fullItems.push({ index: i });
    }

    return {
      isVirtual: false,
      virtualItems: fullItems,
      startIndex: 0,
      endIndex: itemCount,
      topSpacerHeight: 0,
      bottomSpacerHeight: 0,
    };
  }

  const { scrollTop, viewportHeight } = scrollState;

  const rawStartIndex = Math.floor(scrollTop / estimatedItemHeight);
  const rawEndIndex = Math.ceil((scrollTop + viewportHeight) / estimatedItemHeight);

  const startIndex = Math.max(0, rawStartIndex - overscan);
  const endIndex = Math.min(itemCount, rawEndIndex + overscan);

  const topSpacerHeight = startIndex * estimatedItemHeight;
  const bottomSpacerHeight = Math.max(0, (itemCount - endIndex) * estimatedItemHeight);

  const virtualItems: { index: number }[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    virtualItems.push({ index: i });
  }

  return {
    isVirtual: true,
    virtualItems,
    startIndex,
    endIndex,
    topSpacerHeight,
    bottomSpacerHeight,
  };
}
