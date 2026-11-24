/**
 * A tiny synthesized "boop" bark using Web Audio. No audio files.
 * The AudioContext is created lazily and only after the page has had a user gesture
 * (browser autoplay rules). Any failure is silent: the dog just doesn't bark.
 */
export interface Barker {
  boop(): void;
}

type AudioCtor = typeof AudioContext;

export function createBarker(win: Window = window): Barker {
  let ctx: AudioContext | null = null;

  const hasGesture = (): boolean => {
    const activation = (win.navigator as Navigator & { userActivation?: UserActivation })
      .userActivation;
    // Browsers without the API: let resume() decide.
    return activation ? activation.hasBeenActive : true;
  };

  const getContext = (): AudioContext | null => {
    if (ctx) return ctx;
    const Ctor = (win as Window & { AudioContext?: AudioCtor }).AudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  };

  const chirp = (ac: AudioContext, at: number, from: number, to: number, len: number): void => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + len);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(gain).connect(ac.destination);
    osc.start(at);
    osc.stop(at + len + 0.02);
  };

  const play = (ac: AudioContext): void => {
    const t = ac.currentTime + 0.01;
    chirp(ac, t, 620, 340, 0.12);
    chirp(ac, t + 0.13, 760, 430, 0.1);
  };

  return {
    boop() {
      try {
        if (!hasGesture()) return;
        const ac = getContext();
        if (!ac) return;
        if (ac.state === 'suspended') {
          ac.resume().then(
            () => play(ac),
            () => undefined,
          );
        } else {
          play(ac);
        }
      } catch {
        // Silence is a fine fallback.
      }
    },
  };
}
