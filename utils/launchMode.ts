/** A native Capacitor shell, installed PWA window or iOS home-screen launch. */
export function isInstalledApp(
  native = false,
  browser: Pick<Window,'matchMedia'|'navigator'> | undefined = typeof window === 'undefined' ? undefined : window
): boolean {
  if(native)return true;
  if(!browser)return false;
  const navigator = browser.navigator as Navigator & {standalone?:boolean};
  return navigator.standalone === true ||
    browser.matchMedia('(display-mode: standalone)').matches ||
    browser.matchMedia('(display-mode: window-controls-overlay)').matches;
}
