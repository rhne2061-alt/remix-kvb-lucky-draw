import { describe, expect, it } from "vitest";

import { validateImageUploadFile } from "./images";

describe("validateImageUploadFile", () => {
  it("rejects svg uploads", () => {
    const file = new File(["<svg></svg>"], "logo.svg", {
      type: "image/svg+xml",
    });

    const result = validateImageUploadFile(file);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("只支持 PNG、JPG、JPEG、WEBP 图片");
  });

  it("rejects files above the configured size limit", () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "bg.png", {
      type: "image/png",
    });

    const result = validateImageUploadFile(file, {
      maxFileSizeBytes: 5 * 1024 * 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("图片不能超过 5MB");
  });

  it("accepts safe raster image uploads", () => {
    const file = new File([new Uint8Array(1024)], "cover.webp", {
      type: "image/webp",
    });

    const result = validateImageUploadFile(file);

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
