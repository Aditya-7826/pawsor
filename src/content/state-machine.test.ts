import { describe, expect, it } from 'vitest';
import { ARRIVE_EPSILON, FOLLOW_THRESHOLD, SIT_AFTER_MS } from './config';
import {
  initialState,
  run,
  sense,
  transition,
  type MachineState,
  type Senses,
  type StateName,
} from './state-machine';

const at = (name: StateName, since = 0): MachineState => ({ name, since });

describe('transition: idle, follow, sit', () => {
  it('starts idle', () => {
    expect(initialState(5)).toEqual({ name: 'idle', since: 5 });
  });

  it('idle → follow when the cursor is far', () => {
    expect(transition(at('idle'), { type: 'FAR', at: 10 })).toEqual(at('follow', 10));
  });

  it('follow → idle on arrival', () => {
    expect(transition(at('follow'), { type: 'ARRIVED', at: 20 })).toEqual(at('idle', 20));
  });

  it('idle → sit when the cursor is still', () => {
    expect(transition(at('idle'), { type: 'STILL', at: 30 })).toEqual(at('sit', 30));
  });

  it('sit → follow when the cursor goes far', () => {
    expect(transition(at('sit'), { type: 'FAR', at: 40 })).toEqual(at('follow', 40));
  });

  it('ignores unrelated events without creating a new object', () => {
    const idle = at('idle');
    const follow = at('follow');
    const sit = at('sit');
    expect(transition(idle, { type: 'ARRIVED', at: 1 })).toBe(idle);
    expect(transition(follow, { type: 'FAR', at: 1 })).toBe(follow);
    expect(transition(follow, { type: 'STILL', at: 1 })).toBe(follow);
    expect(transition(sit, { type: 'STILL', at: 1 })).toBe(sit);
    expect(transition(sit, { type: 'ARRIVED', at: 1 })).toBe(sit);
  });

  it('run applies events in order', () => {
    const s = run(at('idle'), [
      { type: 'FAR', at: 1 },
      { type: 'STILL', at: 1 },
    ]);
    expect(s).toEqual(at('follow', 1));
  });
});

describe('sense', () => {
  const base: Senses = { now: 1000, distanceToCursor: 0, distanceToTarget: 0, lastMoveAt: 1000 };

  it('reports nothing when the cursor is near and moving', () => {
    expect(sense(at('idle'), { ...base, distanceToCursor: 50 })).toEqual([]);
  });

  it('reports FAR past the follow threshold', () => {
    const events = sense(at('idle'), {
      ...base,
      distanceToCursor: FOLLOW_THRESHOLD + 1,
      distanceToTarget: 41,
    });
    expect(events).toEqual([{ type: 'FAR', at: 1000 }]);
  });

  it('does not report FAR when the dog cannot get any closer (e.g. a corner)', () => {
    const events = sense(at('idle'), { ...base, distanceToCursor: 120, distanceToTarget: 0 });
    expect(events).toEqual([]);
  });

  it('does not report FAR before the first pointer move', () => {
    expect(sense(at('idle'), { ...base, distanceToCursor: null, distanceToTarget: 500 })).toEqual(
      [],
    );
  });

  it('reports ARRIVED only while following', () => {
    const near = { ...base, distanceToCursor: 40, distanceToTarget: ARRIVE_EPSILON };
    expect(sense(at('follow'), near)).toEqual([{ type: 'ARRIVED', at: 1000 }]);
    expect(sense(at('idle'), near)).toEqual([]);
  });

  it('reports STILL after the sit delay', () => {
    const still = { ...base, now: 1000 + SIT_AFTER_MS, distanceToCursor: 40 };
    expect(sense(at('idle'), still)).toEqual([{ type: 'STILL', at: 1000 + SIT_AFTER_MS }]);
    expect(sense(at('idle'), { ...still, now: 999 + SIT_AFTER_MS })).toEqual([]);
  });
});
