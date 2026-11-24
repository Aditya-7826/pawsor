/** All tuning numbers for the dog live here. See docs/ARCHITECTURE.md §6. */

export const DOG_WIDTH = 64;
export const DOG_HEIGHT = 56;
/** Distance from the viewport edge the dog keeps. */
export const EDGE_PADDING = 4;
/** Where the dog's centre first appears, measured from the bottom-left corner. */
export const START_OFFSET = { x: 56, y: 48 } as const;

/** Tag name of the element that hosts the closed Shadow Root. */
export const HOST_TAG = 'pawsor-host';
/** How often to check that the page has not removed the host. */
export const REATTACH_CHECK_MS = 1000;

/** Cursor farther than this (from the dog's centre) makes the dog follow. */
export const FOLLOW_THRESHOLD = 80;
/** The dog stops this far from the cursor so it never covers it. */
export const STOP_DISTANCE = 40;
/** Exponential easing rate (per second) for the lerp toward the target. */
export const FOLLOW_EASE = 4;
/** Top speed in px/s. */
export const MAX_SPEED = 520;
/** Longest frame step; protects against jumps after a stall or tab switch. */
export const MAX_DT_MS = 50;
