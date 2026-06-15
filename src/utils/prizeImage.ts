import { Prize } from "../types";

/**
 * === FIX: append a new prop to a Prize while preserving every other
 *             field. Useful when the operator console needs to set
 *             `customImageUrl` (Firebase Storage download URL) or
 *             `customImageBase64` (legacy offline fallback) without
 *             a deep-merge helper. ===
 */
export function withPrizeImage(
  prize: Prize,
  patch: { customImageUrl?: string | null; customImageBase64?: string | null },
): Prize {
  const next: Prize = { ...prize };
  if (patch.customImageUrl !== undefined) {
    if (patch.customImageUrl === null) {
      delete next.customImageUrl;
    } else {
      next.customImageUrl = patch.customImageUrl;
    }
  }
  if (patch.customImageBase64 !== undefined) {
    if (patch.customImageBase64 === null) {
      delete next.customImageBase64;
    } else {
      next.customImageBase64 = patch.customImageBase64;
    }
  }
  return next;
}

/**
 * Returns the URL or base64 that should be used for `<img src>` in
 * priority order:
 *   1. customImageUrl  (Firebase Storage CDN, scales to GB)
 *   2. imageUrl        (built-in default asset)
 *   3. customImageBase64 (legacy, capped by Firestore 1MB limit)
 *   4. undefined       (caller falls back to inline SVG)
 */
export function resolvePrizeImageSource(prize: Prize): string | undefined {
  if (prize.customImageUrl) return prize.customImageUrl;
  if (prize.imageUrl) return prize.imageUrl;
  if (prize.customImageBase64) return prize.customImageBase64;
  return undefined;
}
