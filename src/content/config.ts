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
