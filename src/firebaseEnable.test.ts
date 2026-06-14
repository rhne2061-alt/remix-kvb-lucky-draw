import { describe, expect, test, vi } from "vitest";

import { shouldEnableFirebase, subscribeToGlobalSettings } from "./firebase";

describe("firebase enable flag", () => {
  test("defaults to disabled in test mode", () => {
    expect(shouldEnableFirebase()).toBe(false);
  });

  test("can be enabled via env flag", () => {
    const prev = process.env.VITE_ENABLE_FIREBASE;
    process.env.VITE_ENABLE_FIREBASE = "true";
    expect(shouldEnableFirebase()).toBe(true);
    process.env.VITE_ENABLE_FIREBASE = prev;
  });

  test("subscribeToGlobalSettings is no-op when disabled", () => {
    const cb = vi.fn();
    const unsub = subscribeToGlobalSettings(cb);
    expect(typeof unsub).toBe("function");
    expect(cb).toHaveBeenCalledTimes(0);
  });
});

