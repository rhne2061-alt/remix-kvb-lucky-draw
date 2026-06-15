// Lightweight, dependency-free hash for static PIN / secret comparison in the
// browser. Returns a base16 string. Uses the Web Crypto SubtleCrypto API when
// available and falls back to a deterministic FNV-1a hash in non-browser
// environments (vitest node env) so unit tests stay deterministic.
export async function hashString(input: string): Promise<string> {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    try {
      const enc = new TextEncoder().encode(input);
      const buf = await globalThis.crypto.subtle.digest("SHA-256", enc);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // fall through to FNV
    }
  }
  // FNV-1a 32-bit fallback
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").repeat(8).slice(0, 64);
}

// Convenience: a constant-time-ish string compare for fixed-length hex digests.
// (Not strictly constant-time, but better than `===` when both operands come
// from user input — short-circuit timing leaks are irrelevant for an operator
// PIN gate on a single-tenant app, but the cost of the helper is zero.)
export function safeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
