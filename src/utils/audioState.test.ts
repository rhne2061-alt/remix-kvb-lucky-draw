import { describe, expect, it } from "vitest";

import { transitionAudioPhase } from "./audioState";

describe("transitionAudioPhase", () => {
  it("moves from idle to armed after user gesture", () => {
    expect(transitionAudioPhase("idle", "user-gesture")).toBe("armed");
  });

  it("moves to spinning on spin-start", () => {
    expect(transitionAudioPhase("armed", "spin-start")).toBe("spinning");
  });

  it("moves to win when landing completes", () => {
    expect(transitionAudioPhase("spinning", "spin-win")).toBe("win");
  });

  it("resets to idle after cleanup", () => {
    expect(transitionAudioPhase("win", "reset")).toBe("idle");
  });
});
