import { useEffect, useRef } from 'react';

/**
 * Интеграция модальных окон с кнопкой «Назад» (popstate).
 * При открытии добавляет запись в history.pushState, а при нажатии «Назад» 
 * закрывает активное модальное окно. Не вызывает history.back() при размонтировании,
 * чтобы не провоцировать каскадные закрытия родительских окон.
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const isPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Always keep latest onClose reference
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      isPushedRef.current = false;
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
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      isPushedRef.current = false;
    };
  }, [isOpen]);
}

export default useModalBackHandler;
