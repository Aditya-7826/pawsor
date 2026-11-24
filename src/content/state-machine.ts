import { ARRIVE_EPSILON, FOLLOW_THRESHOLD, SIT_AFTER_MS } from './config';

/** Pure behaviour logic. No DOM, no clocks: time arrives on events. */

export type StateName = 'idle' | 'follow' | 'sit';

export interface MachineState {
  readonly name: StateName;
  /** Time the state was entered. */
  readonly since: number;
}

export type MachineEvent =
  | { readonly type: 'FAR'; readonly at: number }
  | { readonly type: 'ARRIVED'; readonly at: number }
  | { readonly type: 'STILL'; readonly at: number };

export const initialState = (at = 0): MachineState => ({ name: 'idle', since: at });

const enter = (name: StateName, at: number): MachineState => ({ name, since: at });

/**
 * The single source of truth for behaviour changes. Unlisted state/event pairs return
 * the same state object.
 */
export function transition(state: MachineState, event: MachineEvent): MachineState {
  switch (state.name) {
    case 'idle':
      if (event.type === 'FAR') return enter('follow', event.at);
      if (event.type === 'STILL') return enter('sit', event.at);
      return state;
    case 'follow':
      if (event.type === 'ARRIVED') return enter('idle', event.at);
      return state;
    case 'sit':
      if (event.type === 'FAR') return enter('follow', event.at);
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

/** What the dog can perceive this frame. */
export interface Senses {
  now: number;
  /** Distance from the dog's centre to the cursor, or null if there is no cursor yet. */
  distanceToCursor: number | null;
  /** Distance from the dog to where it would stand next to the cursor (in bounds). */
  distanceToTarget: number;
  /** Time the pointer last moved. */
  lastMoveAt: number;
}

/** Turn raw perception into machine events. Pure, so it is tested alongside `transition`. */
export function sense(state: MachineState, s: Senses): MachineEvent[] {
  const events: MachineEvent[] = [];
  const at = s.now;
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
  if (s.now - s.lastMoveAt >= SIT_AFTER_MS) {
    events.push({ type: 'STILL', at });
  }
  return events;
}
