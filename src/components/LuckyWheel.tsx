import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, Smartphone, Wallet, Coins, Cpu, BookOpen, RefreshCw, TrendingUp, 
  Play, Sparkles, AlertTriangle
} from 'lucide-react';
import { Prize, Participant } from '../types';
import { audio } from '../utils/audio';
import { TRANSLATIONS } from '../translations';
import { PrizeGraphic } from './PrizeGraphic';

interface LuckyWheelProps {
  prizes: Prize[];
  onSpinComplete: (prize: Prize, originalPrize?: Prize, isDowngraded?: boolean, reason?: string) => void;
  onSpinStart: () => { 
    winningPrize: Prize; 
    originalPrize?: Prize; 
    isDowngraded: boolean; 
    reason?: string; 
    error?: string; 
  } | null;
  participant: Participant | null;
  lang?: 'zh' | 'id';
  showProbability?: boolean;
}

export default function LuckyWheel({ prizes, onSpinComplete, onSpinStart, participant, lang = 'id', showProbability }: LuckyWheelProps) {
  const t = TRANSLATIONS[lang];
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const wheelRef = useRef<SVGSVGElement | null>(null);
  
  // Audio tick generator variables
  const currentAngleRef = useRef(0);
  const lastTickAngleRef = useRef(0);

  // Render Slice Lucide Icons
  const renderIcon = (name: string, className = "h-5 w-5") => {
    switch (name) {
      case 'Award': return <Award className={className} />;
      case 'Smartphone': return <Smartphone className={className} />;
      case 'Wallet': return <Wallet className={className} />;
      case 'Coins': return <Coins className={className} />;
      case 'Cpu': return <Cpu className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'TrendingUp': return <TrendingUp className={className} />;
      default: return <RefreshCw className={className} />;
    }
  };

  const handleSpin = () => {
    if (isSpinning) return;
    setErrorMsg(null);

    if (!participant) {
      setErrorMsg('Mohon lengkapi formulir pendaftaran di sebelah kanan terlebih dahulu!');
      audio.playDecline();
      return;
    }

    // Call state manager to evaluate backend rule engine
    const decision = onSpinStart();
    if (!decision) return; // Hook failed or blocked

    if (decision.error) {
      setErrorMsg(decision.error);
      audio.playDecline();
      return;
    }

    const { winningPrize, originalPrize, isDowngraded, reason } = decision;
    
    // Find index of the winning prize
    const winningIndex = prizes.findIndex(p => p.id === winningPrize.id);
    if (winningIndex === -1) return;

    setIsSpinning(true);
    
    const numSlices = prizes.length;
    const sliceAngle = 360 / numSlices;
    const halfSlice = sliceAngle / 2;
    // Calculate the precise stopping angle for the segment center to point at 12 o'clock (0/360 degrees in our shifted coordinate space)
    const segmentCenterAngle = (winningIndex * sliceAngle);
    const stopAngle = (360 - segmentCenterAngle) % 360;
    
    // Total spins (8 high-speed rounds) + the destination angle
    const extraRounds = 8;
    const finalRotation = rotation + (extraRounds * 360) + ((stopAngle - (rotation % 360) + 360) % 360);

    // Dynamic mechanical tick trigger during rotation
    const startTimestamp = performance.now();
    const duration = 5000; // 5 seconds spin
    const startRotation = rotation;

    const animateSpin = (now: number) => {
      const elapsed = now - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic formula for natural deceleration
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const currentRot = startRotation + (finalRotation - startRotation) * easeOutCubic(progress);
      
      setRotation(currentRot);
      currentAngleRef.current = currentRot;

      // Click sound whenever we sweep past a wedge boundary dynamically
      const currentTickSector = Math.floor((currentRot + halfSlice) / sliceAngle);
      const lastTickSector = Math.floor((lastTickAngleRef.current + halfSlice) / sliceAngle);
      
      if (currentTickSector !== lastTickSector) {
        audio.playTick();
        lastTickAngleRef.current = currentRot;
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        setIsSpinning(false);
        // Spin finished: Play success arpeggio
        audio.playSuccess();
        setTimeout(() => {
          onSpinComplete(winningPrize, originalPrize, isDowngraded, reason);
        }, 600);
      }
    };

    requestAnimationFrame(animateSpin);
  };

  return (
    <div id="lucky-wheel-container" className="flex flex-col items-center justify-center p-1.5 xs:p-4 sm:p-6 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden w-full max-w-lg mx-auto">
      {/* Background ambient gold-glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Frame Status Info Banner */}
      <div className="mb-3 text-center z-10 w-full">
        <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-slate-900 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
          {t.wheelTitle}
        </h2>
        <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
          {t.wheelSubtitle}
        </p>
      </div>

      {/* Wheel wrapper containing the mechanical top pointer and frame lights */}
      {/* Optimized: Amplified wheel wrapper proportions in mobile view limits */}
      <div className="relative w-[280px] h-[280px] min-with-360:w-[325px] min-with-360:h-[325px] min-[360px]:w-[320px] min-[360px]:h-[320px] min-[390px]:w-[355px] min-[390px]:h-[355px] sm:w-[430px] sm:h-[430px] md:w-[465px] md:h-[465px] max-w-full my-4 select-none z-10 p-1 border-4 border-amber-500/30 rounded-full bg-slate-950 shadow-3xl">
        {/* Pointer at the very top (12 o'clock) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[8px] z-30 drop-shadow-xl">
          {/* Symmetrical Elegant Golden Triangle pointer */}
          <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-amber-400 filter drop-shadow-md"></div>
          <div className="w-3 h-3 rounded-full bg-rose-600 border border-white absolute -top-1.5 left-[1px] -translate-x-1/2"></div>
        </div>

        {/* Outer glowing frame border with interactive flashing light dots */}
        <div className="absolute inset-0 rounded-full border-[10px] border-[#0e172e] pointer-events-none"></div>
        <div className={`absolute inset-1 rounded-full border border-dashed border-amber-400/35 pointer-events-none ${isSpinning ? 'animate-[spin_25s_linear_infinite]' : ''}`}></div>

        {/* Actual Rotational Wheel (SVG Based) */}
        <svg 
          ref={wheelRef}
          style={{ transform: `rotate(${rotation}deg)` }}
          className="w-full h-full rounded-full overflow-hidden filter drop-shadow-sm transition-transform duration-75" 
          viewBox="0 0 400 400"
        >
          {/* Slices of Wheel */}
          {prizes.map((prize, i) => {
            const numSlices = prizes.length;
            const sliceAngle = 360 / numSlices;
            const halfSlice = sliceAngle / 2;
            const startAngle = i * sliceAngle - halfSlice; // Shift by half a slice to align center lines cleanly
            const endAngle = startAngle + sliceAngle;
            
            // Polar coordinate helper to construct elegant slice arcs
            const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
              const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
              return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
              };
            };

            const start = polarToCartesian(200, 200, 200, endAngle);
            const end = polarToCartesian(200, 200, 200, startAngle);
            const largeArcFlag = sliceAngle <= 180 ? "0" : "1";

            const pathData = [
              "M", 200, 200,
              "L", start.x, start.y,
              "A", 200, 200, 0, largeArcFlag, 0, end.x, end.y,
              "Z"
            ].join(" ");

            // Calculated rotation angle for text and icon in center of the slice
            const textRot = i * sliceAngle;
            const sliceLevel = prize.level || '';

            return (
              <g key={prize.id} className="cursor-pointer group">
                <defs>
                  {/* Create a dedicated vector clipping mask pattern to clip image white backgrounds exactly within the 3D sector boundaries */}
                  <clipPath id={`clip-${prize.id}`}>
                    <path d={pathData} />
                  </clipPath>
                </defs>

                {/* Sector background */}
                <path 
                  d={pathData} 
                  fill={prize.color} 
                  stroke="#070b19" 
                  strokeWidth="2.5"
                  className="transition-all duration-300 hover:brightness-105"
                />
                
                {/* Visual Separators & Highlight Accents */}
                <line 
                  x1="200" y1="200" 
                  x2={end.x} y2={end.y} 
                  stroke="#5a5d64" 
                  strokeWidth="1" 
                  strokeOpacity="0.25"
                />

                {/* Apply the vector clip mask to both the solid background and the image group under the same rendering context so they blend seamlessly */}
                <g clipPath={`url(#clip-${prize.id})`}>
                  {/* Solid sector color background inside the clip group so the image multiply blend mode has a backing layer to blend against */}
                  <path 
                    d={pathData} 
                    fill={prize.color} 
                  />
                  {/* Physical product image nested inside rotating slice segment using a unified rotated coordinate space */}
                  <g transform={`rotate(${textRot} 200 200)`}>
                    <foreignObject 
                      x="140" 
                      y="10" 
                      width="120" 
                      height="120" 
                      className="pointer-events-none"
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        outline: 'none' 
                      }}
                    >
                      <div 
                        className="w-full h-full flex items-center justify-center overflow-visible"
                        style={{ 
                          background: 'transparent',
                          border: 'none'
                        }}
                      >
                        <PrizeGraphic 
                          prizeId={prize.id} 
                          imageUrl={prize.imageUrl}
                          customImageBase64={prize.customImageBase64}
                          className="w-[105px] h-[105px] transition-transform duration-300" 
                          style={{ 
                            filter: 'contrast(1.15) brightness(1.05) saturate(1.1)',
                            transform: 'scale(1.22)',
                            background: 'transparent'
                          }}
                        />
                      </div>
                    </foreignObject>
                  </g>
                </g>

                {/* Draw level tag text on top of the clipped image group to prevent text clipping glitches */}
                <g transform={`rotate(${textRot} 200 200)`}>
                  {/* Elegant level tag text positioned beautifully at a safe intermediate radius to avoid the central brass cap pin */}
                  <text 
                    x="200" 
                    y="152" 
                    fill={prize.textColor} 
                    fontSize="9.5" 
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="950" 
                    textAnchor="middle"
                    className="select-none opacity-95 tracking-widest uppercase font-sans drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.95)]"
                  >
                    {sliceLevel}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Central Golden Brass Cap Pin */}
          <circle cx="200" cy="200" r="38" fill="url(#brass-grad)" stroke="#d4af37" strokeWidth="4" className="shadow-lg" />
          <circle cx="200" cy="200" r="26" fill="#070b19" />
          <circle cx="200" cy="200" r="8" fill="#d4af37" />

          {/* Gradients */}
          <defs>
            <radialGradient id="brass-grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
              <stop offset="0%" stopColor="#FFF4CD" />
              <stop offset="45%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#7a5a0d" />
            </radialGradient>
          </defs>
        </svg>

        {/* Dynamic Sparkle/Spin Center Button overlay */}
        <button 
          id="spin-button"
          onClick={handleSpin}
          disabled={isSpinning}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-18 h-18 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 text-white border-4 border-white font-black font-display text-xs shadow-xl cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 disabled:opacity-80 disabled:cursor-not-allowed select-none z-40"
        >
          {isSpinning ? (
            <span className="text-[9px] animate-spin font-black tracking-widest text-white">SPIN</span>
          ) : (
            <div className="flex flex-col items-center leading-none">
              <Play className="h-4.5 w-4.5 fill-white stroke-white" />
              <span className="text-[9px] font-black font-sans tracking-widest mt-1 uppercase text-white">{t.spinButton}</span>
            </div>
          )}
        </button>
      </div>

      {/* Quick Registration / Action Warning */}
      {errorMsg && (
        <div className="mt-4 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-600 text-xs w-full max-w-sm animate-[bounce_1s_infinite] text-left">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Interactive Probability Indicator (Real Operational Numbers) */}
      {showProbability && (
        <div className="w-full max-w-sm mt-3 border border-slate-200 bg-slate-50 rounded-xl p-3.5 text-[11px] text-slate-700 flex flex-col gap-1.5 font-mono text-left">
          <div className="flex items-center justify-between text-slate-500 text-[10px] border-b border-slate-200 pb-1">
            <span>{lang === 'zh' ? '系统实时中奖比率' : 'Tingkat Kemenangan Sistem'}</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              {lang === 'zh' ? '定量算法运行中' : 'Algoritma Aktif'}
            </span>
          </div>
          {prizes.map((p) => {
            const pct = (p.baseProbability * 100).toFixed(2) + '%';
            const isZero = p.baseProbability === 0;
            return (
              <div key={p.id} className="flex justify-between gap-4">
                <span className="truncate">
                  {lang === 'zh' ? p.levelZh : p.level} ({lang === 'zh' ? p.labelZh : p.label}):
                </span>
                <span className={isZero ? "text-slate-400 font-bold font-mono" : "text-blue-600 font-bold font-mono shrink-0"}>
                  {pct}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
