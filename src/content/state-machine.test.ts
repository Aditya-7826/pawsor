import { describe, expect, it } from 'vitest';
import {
  ARRIVE_EPSILON,
  FOLLOW_THRESHOLD,
  SIT_AFTER_MS,
  SLEEP_AFTER_MS,
  STARTLE_MS,
  STRETCH_MS,
} from './config';
import {
  countRecent,
  initialState,
  isWaking,
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
  const base: Senses = {
    now: 1000,
    distanceToCursor: 0,
    distanceToTarget: 0,
    lastMoveAt: 1000,
    lastInputAt: 1000,
    clicks: [],
  };

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

describe('transition: sleep', () => {
  it('idle and sit fall asleep when inactive', () => {
    expect(transition(at('idle'), { type: 'INACTIVE', at: 5 })).toEqual(at('sleep', 5));
    expect(transition(at('sit'), { type: 'INACTIVE', at: 5 })).toEqual(at('sleep', 5));
  });

  it('a following dog does not fall asleep mid-run', () => {
    const follow = at('follow');
    expect(transition(follow, { type: 'INACTIVE', at: 5 })).toBe(follow);
  });

  it('wakes into idle with a stretch', () => {
    const s = transition(at('sleep'), { type: 'WAKE', at: 100 });
    expect(s).toEqual({ name: 'idle', since: 100, wakingUntil: 100 + STRETCH_MS });
    expect(isWaking(s, 100 + STRETCH_MS - 1)).toBe(true);
    expect(isWaking(s, 100 + STRETCH_MS)).toBe(false);
  });

  it('ignores movement and arrival while asleep', () => {
    const sleep = at('sleep');
    expect(transition(sleep, { type: 'FAR', at: 1 })).toBe(sleep);
    expect(transition(sleep, { type: 'STILL', at: 1 })).toBe(sleep);
    expect(transition(sleep, { type: 'INACTIVE', at: 1 })).toBe(sleep);
  });
});

describe('sense: sleep and wake', () => {
  const quiet: Senses = {
    now: 20_000,
    distanceToCursor: 40,
    distanceToTarget: 0,
    lastMoveAt: 20_000 - SLEEP_AFTER_MS,
    lastInputAt: 20_000 - SLEEP_AFTER_MS,
    clicks: [],
  };

  it('reports INACTIVE after the sleep delay; idle goes sit then sleep in one frame', () => {
    const events = sense(at('idle'), quiet);
    expect(events.map((e) => e.type)).toEqual(['STILL', 'INACTIVE']);
    expect(run(at('idle'), events).name).toBe('sleep');
  });

  it('reports WAKE only for input after falling asleep', () => {
    const asleep = at('sleep', 15_000);
    expect(sense(asleep, { ...quiet, lastInputAt: 14_000 }).map((e) => e.type)).not.toContain(
      'WAKE',
    );
    expect(sense(asleep, { ...quiet, lastInputAt: 16_000 }).map((e) => e.type)).toContain('WAKE');
  });

  it('wakes into a stretch even if the cursor is far, then follows', () => {
    const asleep = at('sleep', 15_000);
    const far = { ...quiet, distanceToCursor: 500, distanceToTarget: 460, lastInputAt: 19_999 };
    const awake = run(asleep, sense(asleep, far));
    expect(awake.name).toBe('idle');
    expect(sense(awake, { ...far, now: 20_000 + STRETCH_MS - 1 })).toEqual([]);
    const later = { ...far, now: 20_000 + STRETCH_MS, lastMoveAt: 20_000 + STRETCH_MS };
    expect(run(awake, sense(awake, later)).name).toBe('follow');
  });
});

describe('startled', () => {
  const calm: Senses = {
    now: 10_000,
    distanceToCursor: 40,
    distanceToTarget: 0,
    lastMoveAt: 10_000,
    lastInputAt: 10_000,
    clicks: [],
  };

  it('counts only clicks inside the window', () => {
    expect(countRecent([100, 500, 900, 1000], 1000, 600)).toBe(3);
    expect(countRecent([100, 200], 1000, 600)).toBe(0);
    expect(countRecent([1200], 1000, 600)).toBe(0);
  });

  it('3 clicks within 600ms startle the dog from any calm state', () => {
    const clicks = [9_500, 9_700, 9_900];
    for (const name of ['idle', 'follow', 'sit', 'sleep'] as const) {
      const s = run(at(name), sense(at(name), { ...calm, clicks }));
      expect(s.name, name).toBe('startled');
    }
  });

  it('2 clicks, or 3 slow clicks, do not', () => {
    expect(sense(at('idle'), { ...calm, clicks: [9_800, 9_900] })).toEqual([]);
    expect(sense(at('idle'), { ...calm, clicks: [9_000, 9_500, 9_900] })).toEqual([]);
  });

  it('more rapid clicks while startled do not restart it', () => {
    const startled = at('startled', 9_950);
    const s = run(startled, sense(startled, { ...calm, clicks: [9_800, 9_900, 9_990] }));
    expect(s).toBe(startled);
  });

  it('returns to idle after the startle time', () => {
    const startled = at('startled', 10_000 - STARTLE_MS);
    expect(run(startled, sense(startled, calm))).toEqual(at('idle', 10_000));
    const early = at('startled', 10_000 - STARTLE_MS + 1);
    expect(run(early, sense(early, calm))).toBe(early);
  });

  it('ignores TIMEOUT in other states', () => {
    const idle = at('idle');
    expect(transition(idle, { type: 'TIMEOUT', at: 1 })).toBe(idle);
  });
});
