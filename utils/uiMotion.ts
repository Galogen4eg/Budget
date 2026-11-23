/** Terra motion presets. Geometry stays stable; reduced-motion never waits for animation. */
export const agendaDisclosureTransition = (reducedMotion: boolean) => (
  reducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: 'easeOut' as const }
);
