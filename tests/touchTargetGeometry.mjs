// DOMRect can lose a few floating-point bits when translated by an animation.
// This epsilon is smaller than a Chromium layout unit (1/64 CSS px).
export const MIN_TOUCH_TARGET_PX=44;
export const TOUCH_TARGET_EPSILON_PX=1/1024;
export const TOUCH_TARGET_MEASURED_MIN_PX=MIN_TOUCH_TARGET_PX-TOUCH_TARGET_EPSILON_PX;
export const meetsTouchDimension=value=>Number.isFinite(value)&&value>=TOUCH_TARGET_MEASURED_MIN_PX;
export const meetsTouchTarget=rect=>Boolean(rect&&meetsTouchDimension(rect.width)&&meetsTouchDimension(rect.height));
