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
    // === FIX: from the spinning state we ignore further user-gesture events
    //             so the phase machine doesn't fall back to `spinning` (the
    //             default) and silently drop the state. This used to corrupt
    //             the modal flow when the operator double-clicked the spin
    //             button. ===
    "user-gesture": "spinning",
    reset: "idle",
  },
  win: {
    // === FIX: from the win state we either go back to idle (modal closed)
    //             or re-arm on a fresh user-gesture — both are valid paths.
    //             Previously only `reset` was wired, so any other event
    //             silently no-op'd. ===
    "user-gesture": "armed",
    reset: "idle",
  },
};

export function transitionAudioPhase(
  current: AudioPhase,
  event: AudioEvent,
): AudioPhase {
  return TRANSITIONS[current][event] ?? current;
}
