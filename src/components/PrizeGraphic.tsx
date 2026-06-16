import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Coins,
  FileText,
  Gift,
  Laptop,
  Pickaxe,
  Smartphone,
} from "lucide-react";

interface PrizeGraphicProps {
  prizeId: string;
  imageUrl?: string;
  customImageBase64?: string;
  className?: string;
  style?: React.CSSProperties;
  emphasize?: boolean;
}

function FallbackIcon({ prizeId }: { prizeId: string }) {
  switch (prizeId) {
    case "gold10g":
      return (
        <Coins className="w-[72%] h-[72%] text-amber-300 drop-shadow-[0_0_24px_rgba(245,158,11,0.35)]" />
      );
    case "ninja250":
      return (
        <Award className="w-[72%] h-[72%] text-emerald-300 drop-shadow-[0_0_24px_rgba(16,185,129,0.28)]" />
      );
    case "macbook":
      return (
        <Laptop className="w-[72%] h-[72%] text-slate-100 drop-shadow-[0_0_24px_rgba(148,163,184,0.28)]" />
      );
    case "iphone16":
      return (
        <Smartphone className="w-[72%] h-[72%] text-sky-200 drop-shadow-[0_0_24px_rgba(96,165,250,0.3)]" />
      );
    case "trade_signal":
      return (
        <Pickaxe className="w-[72%] h-[72%] text-cyan-200 drop-shadow-[0_0_24px_rgba(34,211,238,0.28)]" />
      );
    case "whitepaper":
    case "gold_guide":
      return (
        <FileText className="w-[72%] h-[72%] text-indigo-200 drop-shadow-[0_0_24px_rgba(129,140,248,0.3)]" />
      );
    default:
      return (
        <Gift className="w-[72%] h-[72%] text-rose-200 drop-shadow-[0_0_24px_rgba(244,114,182,0.28)]" />
      );
  }
}

export function PrizeGraphic({
  prizeId,
  imageUrl,
  customImageBase64,
  className = "w-20 h-20",
  style = {},
  emphasize = false,
}: PrizeGraphicProps) {
  const displayImageSrc = useMemo(
    () => customImageBase64 || imageUrl,
    [customImageBase64, imageUrl],
  );
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const prevSrcRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prev = prevSrcRef.current;
    prevSrcRef.current = displayImageSrc;
    if (!displayImageSrc) return;
    // blob→cloud 或 cloud→cloud 属于升级，跳过 spinner 直接等新图加载
    if (prev && displayImageSrc !== prev) {
      return;
    }
    setImgLoaded(false);
    setFailedSrc(null);
  }, [displayImageSrc]);

  const isFailed = !!displayImageSrc && failedSrc === displayImageSrc;
  const frameClass = emphasize
    ? "prize-frame animate-prize-pulse"
    : "prize-frame";

  if (displayImageSrc && !isFailed) {
    return (
      <div
        className={`relative overflow-hidden ${frameClass} ${className}`}
        style={style}
      >
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-transparent to-transparent pointer-events-none" />
        <img
          src={displayImageSrc}
          alt="Hadiah"
          className={`w-full h-full object-contain p-3 [filter:brightness(1.08)_contrast(1.06)_saturate(1.08)_drop-shadow(0_12px_24px_rgba(15,23,42,0.35))] transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setFailedSrc(displayImageSrc)}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${frameClass} ${className} flex items-center justify-center`}
      style={style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
      <FallbackIcon prizeId={prizeId} />
    </div>
  );
}
