import { useEffect, useRef } from 'react';

/**
 * Интеграция модальных окон с системной кнопкой «Назад» на Android (popstate).
 * При открытии добавляет запись в history.pushState, а при нажатии «Назад» 
 * закрывает только активное модальное окно без ухода с текущей вкладки.
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (isPushedRef.current) {
        isPushedRef.current = false;
      }
      return;
    }

    const modalId = `modal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      window.history.pushState({ modalId }, '');
      isPushedRef.current = true;
    } catch (e) {
      console.warn("Failed to push state for modal back handler:", e);
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (window.history.state?.modalId === modalId) {
          try {
            window.history.back();
          } catch (e) {
            console.warn("Failed to revert history state:", e);
          }
        }
      }
    };
  }, [isOpen, onClose]);
}

export default useModalBackHandler;
