import { describe, expect, test, vi, beforeEach } from "vitest";

import { shouldEnableFirebase, subscribeToGlobalSettings } from "./firebase";

describe("firebase enable flag", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  test("defaults to disabled in test mode", () => {
    vi.stubEnv("VITE_ENABLE_FIREBASE", "false");
    vi.stubEnv("PROD", false);
    expect(shouldEnableFirebase()).toBe(false);
  });

  test("can be enabled via env flag", () => {
    vi.stubEnv("VITE_ENABLE_FIREBASE", "true");
    vi.stubEnv("PROD", false);
    expect(shouldEnableFirebase()).toBe(true);
  });

  test("subscribeToGlobalSettings is no-op when disabled", () => {
    vi.stubEnv("VITE_ENABLE_FIREBASE", "false");
    vi.stubEnv("PROD", false);
    const cb = vi.fn();
    const unsub = subscribeToGlobalSettings(cb);
    expect(typeof unsub).toBe("function");
    expect(cb).toHaveBeenCalledTimes(0);
  });
});

