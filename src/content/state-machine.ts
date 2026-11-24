import {
  ARRIVE_EPSILON,
  FOLLOW_THRESHOLD,
  SIT_AFTER_MS,
  SLEEP_AFTER_MS,
  STARTLE_CLICKS,
  STARTLE_MS,
  STARTLE_WINDOW_MS,
  STRETCH_MS,
} from './config';

/** Pure behaviour logic. No DOM, no clocks: time arrives on events. */

export type StateName = 'idle' | 'follow' | 'sit' | 'sleep' | 'startled' | 'perch';

export interface MachineState {
  readonly name: StateName;
  /** Time the state was entered. */
  readonly since: number;
  /** Set when waking from sleep: the dog stretches until this time before moving. */
  readonly wakingUntil?: number;
}

export type MachineEvent =
  | { readonly type: 'FAR'; readonly at: number }
  | { readonly type: 'ARRIVED'; readonly at: number }
  | { readonly type: 'STILL'; readonly at: number }
  | { readonly type: 'INACTIVE'; readonly at: number }
  | { readonly type: 'WAKE'; readonly at: number }
  | { readonly type: 'RAPID_CLICKS'; readonly at: number }
  | { readonly type: 'TIMEOUT'; readonly at: number }
  | { readonly type: 'SELECT'; readonly at: number }
  | { readonly type: 'DESELECT'; readonly at: number };

export const initialState = (at = 0): MachineState => ({ name: 'idle', since: at });

const enter = (name: StateName, at: number): MachineState => ({ name, since: at });

/**
 * The single source of truth for behaviour changes. Unlisted state/event pairs return
 * the same state object.
 */
export function transition(state: MachineState, event: MachineEvent): MachineState {
  // Startle wins over everything except an ongoing startle.
  if (event.type === 'RAPID_CLICKS' && state.name !== 'startled') {
    return enter('startled', event.at);
  }
  switch (state.name) {
    case 'idle':
      if (event.type === 'SELECT') return enter('perch', event.at);
      if (event.type === 'FAR') return enter('follow', event.at);
      if (event.type === 'STILL') return enter('sit', event.at);
      if (event.type === 'INACTIVE') return enter('sleep', event.at);
      return state;
    case 'follow':
      if (event.type === 'SELECT') return enter('perch', event.at);
      if (event.type === 'ARRIVED') return enter('idle', event.at);
      return state;
    case 'sit':
      if (event.type === 'SELECT') return enter('perch', event.at);
      if (event.type === 'FAR') return enter('follow', event.at);
      if (event.type === 'INACTIVE') return enter('sleep', event.at);
      return state;
    case 'sleep':
      if (event.type === 'WAKE') {
        return { name: 'idle', since: event.at, wakingUntil: event.at + STRETCH_MS };
      }
      return state;
    case 'perch':
      if (event.type === 'DESELECT') return enter('idle', event.at);
      if (event.type === 'INACTIVE') return enter('sleep', event.at);
      return state;
    case 'startled':
      if (event.type === 'TIMEOUT') return enter('idle', event.at);
      return state;
    default: {
      const unreachable: never = state.name;
      return unreachable;
    }
  }
}

/** Apply events in order. Earlier events win when they change the state first. */
export function run(state: MachineState, events: readonly MachineEvent[]): MachineState {
  return events.reduce(transition, state);
}

/** True while the dog is still stretching after a nap. */
export function isWaking(state: MachineState, now: number): boolean {
  return state.wakingUntil !== undefined && now < state.wakingUntil;
}

/** What the dog can perceive this frame. */
export interface Senses {
  now: number;
  /** Distance from the dog's centre to the cursor, or null if there is no cursor yet. */
  distanceToCursor: number | null;
  /** Distance from the dog to where it would stand next to the cursor (in bounds). */
  distanceToTarget: number;
  /** Time the pointer last moved. */
  lastMoveAt: number;
  /** Time of the last input of any kind (pointer, click, key, scroll, touch). */
  lastInputAt: number;
  /** Recent click timestamps, oldest first. */
  clicks: readonly number[];
  /** A non-empty text selection exists on the page. */
  hasSelection: boolean;
}

/** How many of `times` fall within the last `windowMs` before `now`. */
export function countRecent(times: readonly number[], now: number, windowMs: number): number {
  return times.filter((t) => t <= now && now - t <= windowMs).length;
}

/**
 * Turn raw perception into machine events, in priority order. Pure, so it is tested
 * alongside `transition`. WAKE comes last so a frame that wakes the dog cannot also
 * send it running: it stretches first.
 */
export function sense(state: MachineState, s: Senses): MachineEvent[] {
  const events: MachineEvent[] = [];
  const at = s.now;
  if (isWaking(state, s.now)) return events;

  if (
    s.distanceToCursor !== null &&
    s.distanceToCursor > FOLLOW_THRESHOLD &&
    s.distanceToTarget > ARRIVE_EPSILON
  ) {
    events.push({ type: 'FAR', at });
  }
  if (state.name === 'follow' && s.distanceToTarget <= ARRIVE_EPSILON) {
    events.push({ type: 'ARRIVED', at });
  }
  if (s.hasSelection && state.name !== 'perch') {
    events.push({ type: 'SELECT', at });
  }
  if (!s.hasSelection && state.name === 'perch') {
    events.push({ type: 'DESELECT', at });
  }
  if (s.now - s.lastMoveAt >= SIT_AFTER_MS) {
    events.push({ type: 'STILL', at });
  }
  if (s.now - s.lastInputAt >= SLEEP_AFTER_MS) {
    events.push({ type: 'INACTIVE', at });
  }
  if (countRecent(s.clicks, s.now, STARTLE_WINDOW_MS) >= STARTLE_CLICKS) {
    events.push({ type: 'RAPID_CLICKS', at });
  }
  if (state.name === 'startled' && s.now - state.since >= STARTLE_MS) {
    events.push({ type: 'TIMEOUT', at });
  }
  if (state.name === 'sleep' && s.lastInputAt > state.since) {
    events.push({ type: 'WAKE', at });
  }
  return events;
}
