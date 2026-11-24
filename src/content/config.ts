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

/** Within this many px of its target the dog counts as arrived. */
export const ARRIVE_EPSILON = 2;
/** Cursor still this long → the dog sits. */
export const SIT_AFTER_MS = 2000;

/** Idle life: blink and ear twitch timings. */
export const BLINK_MIN_MS = 2000;
export const BLINK_MAX_MS = 6000;
export const BLINK_MS = 140;
export const TWITCH_MIN_MS = 4000;
export const TWITCH_MAX_MS = 9000;
export const TWITCH_MS = 360;
/** How far the eyes shift and the head tilts toward the cursor. */
export const LOOK_MAX_PX = 1.6;
export const HEAD_TILT_MAX_DEG = 6;

/** Speed scaling: px/s per px of distance, with a floor so short hops still look lively. */
export const SPEED_GAIN = 2.2;
export const MIN_SPEED = 140;
/** Horizontal movement smaller than this does not flip the dog (prevents flicker). */
export const FACING_DEAD_ZONE = 4;
/** When idle, the dog turns to face the cursor once it is this far to the other side. */
export const FACE_CURSOR_MIN_DX = 24;
/** Leg cycle duration at the slowest and fastest trot (seconds). */
export const TROT_SLOW_S = 0.5;
export const TROT_FAST_S = 0.22;
