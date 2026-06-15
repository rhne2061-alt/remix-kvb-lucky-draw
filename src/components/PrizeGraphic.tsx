import React from "react";

import { Prize } from "../types";
import { resolvePrizeImageSource } from "../utils/prizeImage";
import { getPrizeIllustration } from "./prizeIllustrations";

interface PrizeGraphicProps {
  /**
   * === FIX: `prizeId` is now optional because the new caller path
   *             hands the entire `Prize` object via the `prize`
   *             prop. We still keep `prizeId` for legacy callers
   *             that pass individual props. ===
   */
  prizeId?: string;
  imageUrl?: string;
  customImageBase64?: string;
  customImageUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  emphasize?: boolean;
  size?: "cell" | "large";
  prize?: Prize;
}

/**
 * Renders the prize illustration. Resolution is decided at the SVG layer
 * (viewBox 256×256), so the image stays crisp at 80px in the cell and at
 * 280px in the win modal without applying any image-rendering filters.
 *
 * === FIX: priority is now
 *       customImageUrl > customImageBase64 > imageUrl > SVG fallback ===
 *       The base64 path is preserved for offline use, but the operator
 *       upload flow should always populate `customImageUrl` first.
 */
export function PrizeGraphic({
  prizeId,
  imageUrl,
  customImageBase64,
  customImageUrl,
  className = "w-20 h-20",
  style = {},
  emphasize = false,
  size = "cell",
  prize,
}: PrizeGraphicProps) {
  // Resolve the source from the Prize object first, then fall back to
  // the individual props so legacy callers (which pass props) keep
  // working.
  const resolved = prize
    ? resolvePrizeImageSource(prize)
    : customImageUrl || customImageBase64 || imageUrl;

  const effectivePrizeId = prizeId ?? prize?.id ?? "cobalagi";

  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const hasCustom = !!resolved && resolved !== failedSrc;

  if (hasCustom && resolved) {
    const padding = size === "large" ? "p-4" : "p-1.5";
    return (
      <div
        className={`relative overflow-hidden rounded-[1.35rem] border border-white/12 bg-gradient-to-br from-white/12 via-white/6 to-transparent ${className}`}
        style={style}
      >
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={resolved}
          alt="Hadiah"
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-contain ${padding} transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => {
            setImgLoaded(true);
            if (typeof console !== "undefined") {
              const kb = Math.round((resolved.length * 3) / 4 / 1024);
              console.debug(
                `[PrizeGraphic] rendered prize=${effectivePrizeId} srcLen=${resolved.length} (~${kb} KB)`,
              );
            }
          }}
          onError={(e) => {
            console.error(
              `[PrizeGraphic] failed to load image for ${effectivePrizeId}, src=${resolved.substring(0, 100)}...`,
              e,
            );
            setFailedSrc(resolved);
          }}
          style={{ imageRendering: "auto" }}
        />
      </div>
    );
  }

  const padding = size === "large" ? "p-3" : "p-2";
  return (
    <div
      className={`relative overflow-hidden rounded-[1.35rem] border border-white/12 bg-gradient-to-br from-white/10 via-white/4 to-transparent ${className} ${padding}`}
      style={style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />
      <div
        className={`relative w-full h-full ${
          emphasize ? "animate-prize-pulse" : ""
        }`}
      >
        {getPrizeIllustration(effectivePrizeId)}
      </div>
    </div>
  );
}
