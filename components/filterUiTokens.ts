/** Shared mobile/desktop Terra filter primitives.
 * The rail scrolls as one unit; chips must never shrink or wrap internally.
 */
export const FILTER_RAIL = 'flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar py-1';
export const FILTER_CHIP = 'inline-flex min-h-[44px] flex-none shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]';
export const FILTER_CHIP_ACTIVE = 'bg-[#4A7C59] text-white shadow-xs';
export const FILTER_CHIP_IDLE = 'bg-[#EAE6DD] dark:bg-[#252528] text-[#2E3230] dark:text-gray-200 hover:bg-[#DDD7CB] dark:hover:bg-white/15';
