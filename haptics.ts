/**
 * Safe Haptic Feedback (vibration) utility for mobile web
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' = 'light') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  
  try {
    switch (type) {
      case 'selection':
      case 'light':
        navigator.vibrate(8);
        break;
      case 'medium':
        navigator.vibrate(15);
        break;
      case 'heavy':
        navigator.vibrate(25);
        break;
      case 'success':
        navigator.vibrate([10, 30, 15]);
        break;
      case 'error':
        navigator.vibrate([20, 50, 20, 50, 20]);
        break;
    }
  } catch {
    // Ignore vibration error on unsupported hardware
  }
};

export default triggerHaptic;
