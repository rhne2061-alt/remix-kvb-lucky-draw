// Inline SVG prize illustrations — zero network dependency, fully crisp
// at any size, recolour-friendly. Each illustration uses a 256x256 viewBox
// and assumes it will be rendered with `object-contain`.
//
// Why inline SVG instead of lucide / PNG:
//   • lucide icons are placeholders, not "product photos" — they look like
//     icons rather than prizes, which is what the user complained about.
//   • PNGs are limited to 80–128 px in this grid and look blurry when the
//     PrizeGraphic component applies brightness/contrast/saturate filters.
//   • SVG paths scale infinitely and re-render the same in the 80px cell
//     and the 280px modal.
//
// All 8 prize slots get a unique illustration; no `default` fallback.

import React from "react";

type IllustrationProps = { className?: string };

export const Gold10gIllustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Gold bar 10g"
  >
    <defs>
      <linearGradient id="gold-bar" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="35%" stopColor="#F5C542" />
        <stop offset="70%" stopColor="#D4A017" />
        <stop offset="100%" stopColor="#8C6A11" />
      </linearGradient>
      <linearGradient id="gold-bar-top" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFF2B0" />
        <stop offset="100%" stopColor="#D4A017" />
      </linearGradient>
    </defs>
    {/* Base shadow */}
    <ellipse cx="128" cy="200" rx="84" ry="10" fill="#0F172A" opacity="0.55" />
    {/* Front face */}
    <path
      d="M40 110 L128 150 L216 110 L128 70 Z"
      fill="url(#gold-bar)"
      stroke="#7A5A0F"
      strokeWidth="1.5"
    />
    {/* Bottom edge */}
    <path
      d="M40 110 L40 130 L128 170 L128 150 Z"
      fill="url(#gold-bar-top)"
      stroke="#7A5A0F"
      strokeWidth="1.2"
      opacity="0.95"
    />
    <path
      d="M216 110 L216 130 L128 170 L128 150 Z"
      fill="url(#gold-bar-top)"
      stroke="#7A5A0F"
      strokeWidth="1.2"
      opacity="0.78"
    />
    {/* Stamp on top */}
    <g opacity="0.85">
      <rect
        x="108"
        y="92"
        width="40"
        height="22"
        fill="none"
        stroke="#5C4308"
        strokeWidth="1.2"
        rx="2"
      />
      <text
        x="128"
        y="107"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="10"
        fontWeight="800"
        fill="#5C4308"
        letterSpacing="1"
      >
        10g
      </text>
    </g>
    {/* Highlight gleam */}
    <path
      d="M70 92 L128 64 L186 92 L128 80 Z"
      fill="#FFEB99"
      opacity="0.55"
    />
  </svg>
);

export const Ninja250Illustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Kawasaki Ninja 250 motorcycle"
  >
    <defs>
      <linearGradient id="ninja-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#0F766E" />
      </linearGradient>
    </defs>
    <ellipse cx="128" cy="208" rx="92" ry="8" fill="#0F172A" opacity="0.5" />
    {/* Rear wheel */}
    <circle cx="60" cy="180" r="28" fill="#1E293B" stroke="#475569" strokeWidth="3" />
    <circle cx="60" cy="180" r="10" fill="#0F172A" />
    {/* Front wheel */}
    <circle cx="196" cy="180" r="28" fill="#1E293B" stroke="#475569" strokeWidth="3" />
    <circle cx="196" cy="180" r="10" fill="#0F172A" />
    {/* Body fairing */}
    <path
      d="M70 160 Q90 110 130 110 L180 110 Q200 110 196 130 L186 152 Q180 162 170 162 L84 162 Q74 162 70 160 Z"
      fill="url(#ninja-body)"
      stroke="#064E3B"
      strokeWidth="1.5"
    />
    {/* Seat */}
    <path
      d="M88 130 L120 130 L130 145 L88 145 Z"
      fill="#0F172A"
    />
    {/* Tank highlight */}
    <path
      d="M118 112 L178 112 Q188 112 186 122 L120 122 Z"
      fill="#A7F3D0"
      opacity="0.55"
    />
    {/* Windshield */}
    <path
      d="M150 96 L172 96 L182 110 L150 110 Z"
      fill="#A7F3D0"
      opacity="0.7"
      stroke="#064E3B"
      strokeWidth="1"
    />
    {/* Handlebar */}
    <line
      x1="186"
      y1="110"
      x2="208"
      y2="98"
      stroke="#0F172A"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* Exhaust */}
    <rect
      x="98"
      y="158"
      width="42"
      height="8"
      rx="2"
      fill="#94A3B8"
    />
  </svg>
);

export const MacbookIllustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="MacBook Pro laptop"
  >
    <defs>
      <linearGradient id="laptop-screen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1E293B" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
    </defs>
    <ellipse cx="128" cy="186" rx="92" ry="6" fill="#0F172A" opacity="0.5" />
    {/* Lid */}
    <rect
      x="44"
      y="60"
      width="168"
      height="106"
      rx="8"
      fill="url(#laptop-screen)"
      stroke="#475569"
      strokeWidth="2"
    />
    {/* Screen content gradient */}
    <rect
      x="56"
      y="72"
      width="144"
      height="82"
      rx="3"
      fill="#0F172A"
    />
    <rect
      x="56"
      y="72"
      width="144"
      height="82"
      rx="3"
      fill="url(#screen-glow)"
      opacity="0.18"
    />
    <defs>
      <linearGradient id="screen-glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#A78BFA" />
      </linearGradient>
    </defs>
    {/* Apple-like dot */}
    <circle cx="128" cy="113" r="9" fill="#CBD5E1" opacity="0.55" />
    {/* Base */}
    <path
      d="M30 170 L226 170 L218 184 L38 184 Z"
      fill="#94A3B8"
      stroke="#475569"
      strokeWidth="1.5"
    />
    <rect x="118" y="170" width="20" height="2" fill="#475569" />
  </svg>
);

export const IphoneIllustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="iPhone 16 Pro"
  >
    <defs>
      <linearGradient id="iphone-body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94A3B8" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>
    </defs>
    <ellipse cx="128" cy="220" rx="62" ry="6" fill="#0F172A" opacity="0.5" />
    {/* Phone body */}
    <rect
      x="76"
      y="28"
      width="104"
      height="200"
      rx="22"
      fill="url(#iphone-body)"
      stroke="#0F172A"
      strokeWidth="2"
    />
    {/* Screen */}
    <rect
      x="86"
      y="44"
      width="84"
      height="168"
      rx="14"
      fill="#0F172A"
    />
    {/* Dynamic island */}
    <rect
      x="110"
      y="50"
      width="36"
      height="10"
      rx="5"
      fill="#020617"
    />
    {/* Screen content gradient */}
    <rect
      x="86"
      y="44"
      width="84"
      height="168"
      rx="14"
      fill="url(#iphone-glow)"
      opacity="0.35"
    />
    <defs>
      <linearGradient id="iphone-glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#38BDF8" />
      </linearGradient>
    </defs>
    {/* Camera bump */}
    <rect
      x="92"
      y="60"
      width="36"
      height="36"
      rx="10"
      fill="#1E293B"
      stroke="#0F172A"
      strokeWidth="1"
    />
    <circle cx="103" cy="71" r="6" fill="#0F172A" stroke="#475569" strokeWidth="1" />
    <circle cx="117" cy="71" r="6" fill="#0F172A" stroke="#475569" strokeWidth="1" />
    <circle cx="103" cy="85" r="6" fill="#0F172A" stroke="#475569" strokeWidth="1" />
    <circle cx="117" cy="85" r="6" fill="#0F172A" stroke="#475569" strokeWidth="1" />
  </svg>
);

export const TradeSignalIllustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="AI trading signal"
  >
    <defs>
      <linearGradient id="card-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0E7490" />
        <stop offset="100%" stopColor="#164E63" />
      </linearGradient>
      <linearGradient id="card-glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <ellipse cx="128" cy="220" rx="84" ry="8" fill="#0F172A" opacity="0.5" />
    {/* Card */}
    <rect
      x="32"
      y="40"
      width="192"
      height="160"
      rx="14"
      fill="url(#card-bg)"
      stroke="#0E7490"
      strokeWidth="2"
    />
    {/* Header strip */}
    <rect
      x="32"
      y="40"
      width="192"
      height="36"
      rx="14"
      fill="url(#card-glow)"
      opacity="0.7"
    />
    <text
      x="48"
      y="63"
      fontFamily="Inter, sans-serif"
      fontSize="13"
      fontWeight="800"
      fill="#FFFFFF"
      letterSpacing="2"
    >
      AI SIGNAL
    </text>
    <text
      x="208"
      y="63"
      textAnchor="end"
      fontFamily="Inter, sans-serif"
      fontSize="11"
      fontWeight="700"
      fill="#FFFFFF"
      letterSpacing="1"
    >
      30D
    </text>
    {/* Chart line */}
    <path
      d="M52 156 L80 132 L100 144 L122 116 L148 138 L172 96 L200 124"
      fill="none"
      stroke="#A5F3FC"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M52 156 L80 132 L100 144 L122 116 L148 138 L172 96 L200 124 L200 184 L52 184 Z"
      fill="url(#card-glow)"
      opacity="0.18"
    />
    {/* Buy marker */}
    <circle cx="172" cy="96" r="5" fill="#FBBF24" stroke="#92400E" strokeWidth="1.5" />
  </svg>
);

export const WhitepaperIllustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Macro allocation whitepaper"
  >
    <defs>
      <linearGradient id="wp-cover" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1E3A8A" />
      </linearGradient>
    </defs>
    <ellipse cx="128" cy="220" rx="76" ry="8" fill="#0F172A" opacity="0.5" />
    {/* Book back */}
    <rect
      x="60"
      y="36"
      width="140"
      height="184"
      rx="4"
      fill="url(#wp-cover)"
      stroke="#1E3A8A"
      strokeWidth="2"
    />
    {/* Spine shadow */}
    <rect x="60" y="36" width="14" height="184" fill="#0F172A" opacity="0.3" />
    {/* Gold seal */}
    <circle cx="160" cy="100" r="32" fill="#FCD34D" stroke="#92400E" strokeWidth="2" />
    <circle cx="160" cy="100" r="22" fill="none" stroke="#92400E" strokeWidth="1.2" />
    <text
      x="160"
      y="98"
      textAnchor="middle"
      fontFamily="Inter, sans-serif"
      fontSize="10"
      fontWeight="800"
      fill="#92400E"
    >
      MACRO
    </text>
    <text
      x="160"
      y="110"
      textAnchor="middle"
      fontFamily="Inter, sans-serif"
      fontSize="9"
      fontWeight="800"
      fill="#92400E"
    >
      2026
    </text>
    {/* Title lines */}
    <rect x="84" y="148" width="80" height="6" rx="1" fill="#FFFFFF" opacity="0.85" />
    <rect x="84" y="162" width="60" height="4" rx="1" fill="#FFFFFF" opacity="0.6" />
    <rect x="84" y="174" width="68" height="4" rx="1" fill="#FFFFFF" opacity="0.4" />
  </svg>
);

export const GoldGuideIllustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="XAUUSD trading guide book"
  >
    <defs>
      <linearGradient id="gg-cover" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#9A3412" />
      </linearGradient>
    </defs>
    <ellipse cx="128" cy="220" rx="76" ry="8" fill="#0F172A" opacity="0.5" />
    {/* Book */}
    <path
      d="M58 50 L130 38 L130 220 L58 210 Z"
      fill="url(#gg-cover)"
      stroke="#7C2D12"
      strokeWidth="2"
    />
    <path
      d="M130 38 L198 50 L198 210 L130 220 Z"
      fill="url(#gg-cover)"
      stroke="#7C2D12"
      strokeWidth="2"
      opacity="0.92"
    />
    {/* Center seam */}
    <line x1="130" y1="38" x2="130" y2="220" stroke="#7C2D12" strokeWidth="1" />
    {/* Gold XAU mark */}
    <g transform="translate(128 116)">
      <circle r="34" fill="#FCD34D" stroke="#92400E" strokeWidth="2" />
      <text
        textAnchor="middle"
        y="6"
        fontFamily="Inter, sans-serif"
        fontSize="22"
        fontWeight="900"
        fill="#7C2D12"
      >
        XAU
      </text>
    </g>
    <rect x="78" y="166" width="50" height="4" rx="1" fill="#FFEDD5" opacity="0.7" />
    <rect x="78" y="178" width="40" height="3" rx="1" fill="#FFEDD5" opacity="0.5" />
  </svg>
);

export const VipIllustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="VIP strategy group card"
  >
    <defs>
      <linearGradient id="vip-card" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0F172A" />
        <stop offset="100%" stopColor="#1E1B4B" />
      </linearGradient>
      <linearGradient id="vip-accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#22D3EE" />
      </linearGradient>
    </defs>
    <ellipse cx="128" cy="200" rx="80" ry="8" fill="#0F172A" opacity="0.5" />
    {/* Card */}
    <rect
      x="28"
      y="52"
      width="200"
      height="124"
      rx="14"
      fill="url(#vip-card)"
      stroke="#312E81"
      strokeWidth="2"
    />
    {/* Holographic strip */}
    <rect
      x="28"
      y="100"
      width="200"
      height="22"
      fill="url(#vip-accent)"
      opacity="0.45"
    />
    <line
      x1="28"
      y1="100"
      x2="228"
      y2="100"
      stroke="#A78BFA"
      strokeWidth="1.2"
    />
    <line
      x1="28"
      y1="122"
      x2="228"
      y2="122"
      stroke="#22D3EE"
      strokeWidth="1.2"
    />
    {/* Crown */}
    <path
      d="M104 80 L116 60 L128 76 L140 60 L152 80 Z"
      fill="#FCD34D"
      stroke="#92400E"
      strokeWidth="1.5"
    />
    <circle cx="116" cy="60" r="3" fill="#FBBF24" />
    <circle cx="140" cy="60" r="3" fill="#FBBF24" />
    <circle cx="128" cy="50" r="3" fill="#FBBF24" />
    {/* Label */}
    <text
      x="128"
      y="148"
      textAnchor="middle"
      fontFamily="Inter, sans-serif"
      fontSize="14"
      fontWeight="900"
      fill="#A78BFA"
      letterSpacing="3"
    >
      VIP ACCESS
    </text>
    <text
      x="128"
      y="166"
      textAnchor="middle"
      fontFamily="JetBrains Mono, monospace"
      fontSize="9"
      fontWeight="500"
      fill="#CBD5E1"
      letterSpacing="2"
    >
      KVB • STRATEGY
    </text>
  </svg>
);

export const CobalagiIllustration: React.FC<IllustrationProps> = ({
  className,
}) => (
  <svg
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Try again tomorrow"
  >
    <defs>
      <linearGradient id="rose-glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#9F1239" />
      </linearGradient>
    </defs>
    <ellipse cx="128" cy="220" rx="68" ry="6" fill="#0F172A" opacity="0.5" />
    <circle
      cx="128"
      cy="128"
      r="80"
      fill="url(#rose-glow)"
      opacity="0.25"
    />
    <text
      x="128"
      y="120"
      textAnchor="middle"
      fontFamily="Inter, sans-serif"
      fontSize="44"
      fontWeight="900"
      fill="#FB7185"
    >
      ↻
    </text>
    <text
      x="128"
      y="156"
      textAnchor="middle"
      fontFamily="Inter, sans-serif"
      fontSize="16"
      fontWeight="800"
      fill="#FECDD3"
      letterSpacing="2"
    >
      BESOK
    </text>
    <text
      x="128"
      y="174"
      textAnchor="middle"
      fontFamily="Inter, sans-serif"
      fontSize="10"
      fontWeight="600"
      fill="#FECDD3"
      opacity="0.7"
    >
      try again tomorrow
    </text>
  </svg>
);

// Single dispatch — keep parity with the existing PrizeGraphic API.
export function getPrizeIllustration(prizeId: string) {
  switch (prizeId) {
    case "gold10g":
      return <Gold10gIllustration className="w-full h-full" />;
    case "ninja250":
      return <Ninja250Illustration className="w-full h-full" />;
    case "macbook":
      return <MacbookIllustration className="w-full h-full" />;
    case "iphone16":
      return <IphoneIllustration className="w-full h-full" />;
    case "trade_signal":
      return <TradeSignalIllustration className="w-full h-full" />;
    case "whitepaper":
      return <WhitepaperIllustration className="w-full h-full" />;
    case "gold_guide":
      return <GoldGuideIllustration className="w-full h-full" />;
    case "vip_slot":
      return <VipIllustration className="w-full h-full" />;
    case "cobalagi":
      return <CobalagiIllustration className="w-full h-full" />;
    default:
      return <CobalagiIllustration className="w-full h-full" />;
  }
}
