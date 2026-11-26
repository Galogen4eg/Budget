/** Terra motion presets. Geometry stays stable; reduced-motion never waits for animation. */
export const agendaDisclosureTransition = (reducedMotion: boolean) => (
  reducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: 'easeOut' as const }
);

/** Terra v2 short, interruptible entrance; reduced motion has no delay. */
export const terraEaseOut: [number,number,number,number] = [.16,1,.3,1];
export const terraTransition=(reduced:boolean,duration=.18)=>({duration:reduced?0:duration,ease:terraEaseOut});
