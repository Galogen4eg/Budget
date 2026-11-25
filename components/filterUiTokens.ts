/** Shared mobile/desktop Terra filter primitives.
 * The rail scrolls as one unit; chips must never shrink or wrap internally.
 */
export const FILTER_RAIL = 'flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar py-1';
export const FILTER_CHIP = 'inline-flex min-h-[44px] flex-none shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]';
export const FILTER_CHIP_ACTIVE = 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]';
export const FILTER_CHIP_IDLE = 'bg-[var(--terra-soft)] text-[var(--terra-ink)] hover:bg-[#DDD7CB] dark:hover:bg-white/15';

/** Section cards: no gradient, large drop shadow or arbitrary radius. */
export const SURFACE_CARD = 'rounded-2xl border border-[var(--terra-border)] bg-[var(--terra-surface)] p-4 sm:p-5';
export const PAGE_HEADING = 'font-headline text-xl sm:text-2xl font-bold tracking-tight text-[var(--terra-ink)]';
export const SECTION_HEADING = 'font-headline text-lg font-bold leading-tight text-[var(--terra-ink)]';

/** Shared 44px toolbar actions and calm dashboard surfaces. */
export const TOOLBAR_ACTION = 'inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]';
export const TOOLBAR_ACTION_IDLE = 'bg-[var(--terra-soft)] text-[var(--terra-ink)] hover:bg-[#DDD7CB] dark:hover:bg-white/15';
export const TOOLBAR_ACTION_PRIMARY = 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] hover:bg-[var(--terra-primary-hover)]';
export const DASHBOARD_CARD = SURFACE_CARD + ' min-w-0';
export const CHART_TOOLTIP = 'bg-[var(--terra-surface)] text-[var(--terra-ink)] border border-[var(--terra-border)] px-3 py-2 rounded-xl text-xs pointer-events-none shadow-sm';
