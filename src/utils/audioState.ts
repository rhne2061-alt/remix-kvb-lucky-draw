export type AudioPhase = "idle" | "armed" | "spinning" | "win";
export type AudioEvent = "user-gesture" | "spin-start" | "spin-win" | "reset";

const TRANSITIONS: Record<AudioPhase, Partial<Record<AudioEvent, AudioPhase>>> = {
  idle: {
    "user-gesture": "armed",
    reset: "idle",
  },
  armed: {
    "spin-start": "spinning",
    reset: "idle",
  },
  spinning: {
    "spin-win": "win",
    reset: "idle",
  },
  win: {
    reset: "idle",
  },
};

export function transitionAudioPhase(
  current: AudioPhase,
  event: AudioEvent,
): AudioPhase {
  return TRANSITIONS[current][event] ?? current;
}
