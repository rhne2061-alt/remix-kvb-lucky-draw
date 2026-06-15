import { describe, expect, it } from "vitest";

import type { Prize } from "../types";
import { resolvePrizeImageSource, withPrizeImage } from "./prizeImage";

const basePrize: Prize = {
  id: "gold10g",
  level: "Hadiah Utama",
  levelZh: "特等奖",
  label: "Gold 10gr",
  labelZh: "Gold 10gr",
  iconName: "Coins",
  baseProbability: 0.01,
  initialStock: 1,
  currentStock: 1,
  weeklyCap: 1,
  color: "#D4AF37",
  textColor: "#1E293B",
};

describe("resolvePrizeImageSource", () => {
  it("returns undefined when no image is set", () => {
    expect(resolvePrizeImageSource(basePrize)).toBeUndefined();
  });

  it("prefers the Firebase Storage download URL", () => {
    const url = "https://firebasestorage.googleapis.com/v0/b/x/o/prizes%2Fgold10g?alt=media";
    expect(
      resolvePrizeImageSource({
        ...basePrize,
        customImageUrl: url,
        customImageBase64: "data:image/png;base64,AAAA",
        imageUrl: "/img/gold.png",
      }),
    ).toBe(url);
  });

  it("falls back to imageUrl when no custom URL is present", () => {
    expect(
      resolvePrizeImageSource({ ...basePrize, imageUrl: "/img/gold.png" }),
    ).toBe("/img/gold.png");
  });

  it("falls back to base64 last", () => {
    expect(
      resolvePrizeImageSource({
        ...basePrize,
        customImageBase64: "data:image/webp;base64,ZZZZ",
      }),
    ).toBe("data:image/webp;base64,ZZZZ");
  });
});

describe("withPrizeImage", () => {
  it("adds a customImageUrl without dropping the other fields", () => {
    const next = withPrizeImage(basePrize, {
      customImageUrl: "https://x/a",
    });
    expect(next.id).toBe("gold10g");
    expect(next.customImageUrl).toBe("https://x/a");
  });

  it("removes customImageUrl when null is passed", () => {
    const next = withPrizeImage(
      { ...basePrize, customImageUrl: "https://x/a" },
      { customImageUrl: null },
    );
    expect(next.customImageUrl).toBeUndefined();
  });

  it("removes customImageBase64 when null is passed", () => {
    const next = withPrizeImage(
      { ...basePrize, customImageBase64: "data:," },
      { customImageBase64: null },
    );
    expect(next.customImageBase64).toBeUndefined();
  });
});
