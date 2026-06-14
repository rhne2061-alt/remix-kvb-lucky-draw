import React, { useEffect, useMemo, useRef, useState } from "react";
import { Prize, Participant } from "../types";
import { PrizeGraphic } from "./PrizeGraphic";
import { TRANSLATIONS } from "../translations";
import { audio } from "../utils/audio";
import { buildSpinPlan, getSpinDelay } from "../utils/gridSpin";

const PERIMETER_GRID_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];

export function getPerimeterIndexForGridCell(gridIdx: number) {
  return PERIMETER_GRID_ORDER.indexOf(gridIdx);
}

interface GridLotteryProps {
  prizes: Prize[];
  onSpinComplete: (
    prize: Prize,
    originalPrize?: Prize,
    isDowngraded?: boolean,
    reason?: string,
  ) => void;
  onSpinStart: () => {
    winningPrize: Prize;
    originalPrize?: Prize;
    isDowngraded: boolean;
    reason?: string;
    error?: string;
  } | null;
  participant: Participant | null;
  lang?: "zh" | "id";
  showProbability?: boolean;
}

export default function GridLottery({
  prizes,
  onSpinComplete,
  onSpinStart,
  participant,
  lang = "id",
  showProbability = false,
}: GridLotteryProps) {
  const t = TRANSLATIONS[lang];
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [drawnResult, setDrawnResult] = useState<{
    winningPrize: Prize;
    originalPrize?: Prize;
    isDowngraded: boolean;
    reason?: string;
  } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPerimeterIndexRef = useRef(0);

  const gridPrizes = useMemo(() => prizes.slice(0, 8), [prizes]);

  const runSpinPlan = (result: NonNullable<typeof drawnResult>) => {
    const targetIndex = gridPrizes.findIndex(
      (prize) => prize.id === result.winningPrize.id,
    );
    if (targetIndex < 0) {
      setIsSpinning(false);
      return;
    }

    const plan = buildSpinPlan({
      currentIndex: currentPerimeterIndexRef.current,
      targetIndex,
      perimeterSize: 8,
      fullLaps: 4,
      slowdownSteps: 8,
    });

    let step = 0;

    const tick = () => {
      const nextIndex = plan[step];
      currentPerimeterIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);

      if (step >= plan.length - 1) {
        void audio.playWinCue();
        timeoutRef.current = null;
        setWinningIndex(targetIndex);
        setIsSpinning(false);
        window.setTimeout(() => {
          onSpinComplete(
            result.winningPrize,
            result.originalPrize,
            result.isDowngraded,
            result.reason,
          );
        }, 520);
        return;
      }

      step += 1;
      timeoutRef.current = window.setTimeout(
        tick,
        getSpinDelay({ step, totalSteps: plan.length }),
      );
    };

    tick();
  };

  const handleStartSpin = async () => {
    if (isSpinning) return;
    audio.primeFromUserGesture();
    setLocalError(null);

    if (!participant) {
      setLocalError(t.registerFirst);
      window.setTimeout(() => setLocalError(null), 3000);
      return;
    }

    const result = onSpinStart();
    if (!result || result.error) {
      setLocalError(result?.error ?? t.registerFirst);
      window.setTimeout(() => setLocalError(null), 3000);
      return;
    }

    setIsSpinning(true);
    setWinningIndex(null);
    setDrawnResult(result);

    await audio.playSpinStart();
    void audio.startSpinLoop();
    runSpinPlan(result);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      audio.reset();
    };
  }, []);

  const renderPrizeCell = (gridIdx: number) => {
    if (gridIdx === 4) {
      return (
        <button
          key="draw-btn"
          disabled={isSpinning}
          onClick={handleStartSpin}
          className={`col-span-1 row-span-1 relative overflow-hidden rounded-[1.6rem] border flex flex-col items-center justify-center aspect-square transition-all duration-200 ${
            isSpinning
              ? "border-amber-200/25 bg-slate-200/90 cursor-not-allowed opacity-85"
              : "border-amber-200/45 bg-[linear-gradient(180deg,#ffe27a_0%,#f7b500_100%)] text-slate-950 shadow-[0_18px_40px_rgba(245,158,11,0.35)] hover:scale-[1.03] active:scale-[0.96]"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_58%)]" />
          {!isSpinning && (
            <div className="absolute inset-y-0 left-0 w-1/2 bg-white/35 blur-md animate-undi-sheen" />
          )}
          <span
            className={`relative z-10 text-[32px] sm:text-[36px] font-black tracking-[0.22em] ${isSpinning ? "text-slate-500" : "text-slate-950"}`}
          >
            {lang === "zh" ? "抽奖" : "UNDI"}
          </span>
          <span className="relative z-10 mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-800/70">
            {isSpinning ? "Memproses" : "Lucky Draw"}
          </span>
        </button>
      );
    }

    const perimeterIdx = getPerimeterIndexForGridCell(gridIdx);

    const prize = gridPrizes[perimeterIdx];
    if (!prize)
      return (
        <div
          key={gridIdx}
          className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10"
        />
      );

    const isActive = activeIndex === perimeterIdx;
    const isWinner = winningIndex === perimeterIdx;
    const isDimmed = winningIndex !== null && !isWinner;

    return (
      <div
        key={gridIdx}
        className={`col-span-1 row-span-1 aspect-square rounded-[1.35rem] relative overflow-hidden transition-all duration-200 border ${
          isWinner
            ? "border-amber-300 bg-slate-950/82 scale-[1.08] shadow-[0_0_36px_rgba(251,191,36,0.42)] z-20"
            : isActive
              ? "border-sky-300 bg-slate-950/70 scale-[1.03] shadow-[0_0_28px_rgba(96,165,250,0.35)] z-10"
              : isDimmed
                ? "border-white/6 bg-slate-950/30 opacity-55 scale-[0.98]"
                : "border-white/10 bg-slate-950/58 hover:border-white/18"
        }`}
      >
        <div
          className={`absolute inset-0 transition-opacity duration-200 ${
            isWinner
              ? "bg-gradient-to-br from-amber-300/20 to-transparent opacity-100"
              : isActive
                ? "bg-gradient-to-br from-sky-300/18 to-transparent opacity-100"
                : "opacity-0"
          }`}
        />
        <div className="flex h-full w-full items-center justify-center">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-1.5">
            <PrizeGraphic
              prizeId={prize.id}
              imageUrl={prize.imageUrl}
              customImageBase64={prize.customImageBase64}
              className="w-full h-full"
              emphasize={isWinner}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[450px] aspect-square rounded-3xl p-3 sm:p-4 shadow-[0_0_40px_rgba(30,58,138,0.2)] relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 ring-4 ring-white/5">
        {/* Lights perimeter - simple CSS dot border effect */}
        <div className="absolute inset-2 border border-dotted border-blue-600/40 rounded-2xl pointer-events-none"></div>

        {localError && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-full z-50 shadow-xl whitespace-nowrap animate-bounce border border-red-400">
            {localError}
          </div>
        )}

        {/* 9 Grid Matrix */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2 sm:gap-2.5 w-full h-full relative z-10 mt-1">
          {Array.from({ length: 9 }).map((_, i) => renderPrizeCell(i))}
        </div>
      </div>
    </div>
  );
}
