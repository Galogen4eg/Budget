/** Shared mobile/desktop Terra filter primitives.
 * The rail scrolls as one unit; chips must never shrink or wrap internally.
 */
export const FILTER_RAIL = 'flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar py-1';
export const FILTER_CHIP = 'inline-flex min-h-[44px] flex-none shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]';
export const FILTER_CHIP_ACTIVE = 'bg-[#4A7C59] text-white shadow-xs';
export const FILTER_CHIP_IDLE = 'bg-[#EAE6DD] dark:bg-[#252528] text-[#2E3230] dark:text-gray-200 hover:bg-[#DDD7CB] dark:hover:bg-white/15';

/** Section cards: no gradient, large drop shadow or arbitrary radius. */
export const SURFACE_CARD = 'rounded-2xl border border-[#EAE5DB] bg-[#FAF8F5] dark:border-white/10 dark:bg-[#1C1C1E] p-4 sm:p-5';
export const PAGE_HEADING = 'font-headline text-xl sm:text-2xl font-bold tracking-tight text-[#2E3230] dark:text-white';
export const SECTION_HEADING = 'font-headline text-lg font-bold leading-tight text-[#2E3230] dark:text-white';

/** Shared 44px toolbar actions and calm dashboard surfaces. */
export const TOOLBAR_ACTION = 'inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]';
export const TOOLBAR_ACTION_IDLE = 'bg-[#EAE6DD] dark:bg-[#252528] text-[#2E3230] dark:text-gray-200 hover:bg-[#DDD7CB] dark:hover:bg-white/15';
export const TOOLBAR_ACTION_PRIMARY = 'bg-[#4A7C59] text-white hover:bg-[#3D6849]';
export const DASHBOARD_CARD = SURFACE_CARD + ' min-w-0';
export const CHART_TOOLTIP = 'bg-[#FAF8F5] dark:bg-[#252528] text-[#2E3230] dark:text-gray-100 border border-[#EAE5DB] dark:border-white/15 px-3 py-2 rounded-xl text-xs pointer-events-none shadow-sm';
