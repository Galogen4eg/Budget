import React, { useState, useCallback, MouseEvent } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  durationMs?: number;
  easing?: string;
  children: React.ReactNode;
}

/**
 * Переиспользуемая кнопка с плавным ripple-эффектом касания для мобильных устройств.
 */
export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  className = '',
  onClick,
  rippleColor = 'rgba(74, 124, 89, 0.25)',
  durationMs = 500,
  easing = 'cubic-bezier(0.1, 0.8, 0.3, 1)',
  disabled = false,
  type = 'button',
  ...props
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handlePointerDown = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple: Ripple = {
      id: Date.now() + Math.random(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, durationMs);
  }, [disabled, durationMs]);

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={handlePointerDown}
      className={`relative overflow-hidden cursor-pointer active:scale-95 transition-all duration-150 select-none ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-1.5 w-full h-full">
        {children}
      </span>
      <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full animate-ripple"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
              backgroundColor: rippleColor,
              animationDuration: `${durationMs}ms`,
              animationTimingFunction: easing,
            }}
          />
        ))}
      </span>
    </button>
  );
};

export default RippleButton;
