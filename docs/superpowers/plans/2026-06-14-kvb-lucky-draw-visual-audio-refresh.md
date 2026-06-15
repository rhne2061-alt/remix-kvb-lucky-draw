# KVB Lucky Draw Visual Audio Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前抽奖页升级为更清晰、更有足球活动氛围、且点击后才开始音效的高级版前端体验，同时保持现有业务流程不变。

**Architecture:** 保留当前 React + Vite 页面结构，不重做抽奖业务逻辑，只把视觉、节奏、音频、中奖揭晓拆成可独立测试的前端模块。把“可测的节奏逻辑”与“可控的音频状态”从组件里抽到工具层，组件只负责渲染与调度，从而降低调动画时的回归风险。

**Tech Stack:** React 19, Vite 6, TypeScript, Tailwind CSS 4, Vitest, HTMLAudioElement, lucide-react

---

## File Structure

### Existing files to modify

- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\PrizeGraphic.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\GridLottery.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\ConfettiEffect.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\App.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\index.css`

### New files to create

- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\gridSpin.ts`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\gridSpin.test.ts`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\audioState.ts`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\audioState.test.ts`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\public\audio\draw-start.mp3`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\public\audio\draw-spin-loop.mp3`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\public\audio\draw-win.mp3`

### Responsibility map

- `src\utils\gridSpin.ts`: 统一输出 3x3 抽奖格的步进轨迹、速度曲线、最终落点
- `src\utils\audioState.ts`: 统一控制 `idle -> armed -> spinning -> win -> idle` 音频状态迁移
- `src\components\GridLottery.tsx`: 负责按钮、格子高亮、调用节奏 helper、通知父组件落点完成
- `src\components\PrizeGraphic.tsx`: 负责奖品图片亮度、边框、降级图标的统一渲染
- `src\App.tsx`: 负责抽奖流程编排、中奖弹层显示时机、页面背景和结果层聚焦
- `src\components\ConfettiEffect.tsx`: 负责不遮挡奖品的庆祝粒子效果

---

### Task 1: 提升奖品清晰度和页面视觉基底

**Files:**
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\PrizeGraphic.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\index.css`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\App.tsx`

- [ ] **Step 1: 在全局样式中补充新的视觉变量和动效类**

在 `src\index.css` 的 `@theme` 和 `@layer utilities` 中加入：

```css
@theme {
  --animate-prize-pulse: prize-pulse 1.8s ease-in-out infinite;
  --animate-undi-sheen: undi-sheen 2.4s linear infinite;
  --animate-win-ring: win-ring 1.2s ease-out both;

  @keyframes prize-pulse {
    0%, 100% { transform: scale(1); filter: brightness(1) saturate(1); }
    50% { transform: scale(1.035); filter: brightness(1.08) saturate(1.08); }
  }

  @keyframes undi-sheen {
    0% { transform: translateX(-140%); opacity: 0; }
    18% { opacity: 0.7; }
    55% { opacity: 0.9; }
    100% { transform: translateX(140%); opacity: 0; }
  }

  @keyframes win-ring {
    0% { transform: scale(0.88); opacity: 0; }
    40% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.08); opacity: 0; }
  }
}

@layer utilities {
  .panel-premium {
    @apply bg-slate-950/55 border border-white/10 shadow-[0_18px_60px_rgba(15,23,42,0.42)] backdrop-blur-md;
  }

  .prize-frame {
    @apply rounded-[1.35rem] border border-white/12 bg-gradient-to-br from-white/12 via-white/6 to-transparent;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 18px 40px rgba(2,6,23,0.32);
  }

  .text-gold-soft {
    color: #f5d77a;
    text-shadow: 0 0 24px rgba(245, 215, 122, 0.18);
  }
}
```

- [ ] **Step 2: 重写奖品图片渲染组件，统一亮度、边框和兜底图标表现**

把 `src\components\PrizeGraphic.tsx` 改成：

```tsx
import React, { useMemo, useState } from "react";
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
      return <Coins className="w-[72%] h-[72%] text-amber-300 drop-shadow-[0_0_24px_rgba(245,158,11,0.35)]" />;
    case "ninja250":
      return <Award className="w-[72%] h-[72%] text-emerald-300 drop-shadow-[0_0_24px_rgba(16,185,129,0.28)]" />;
    case "macbook":
      return <Laptop className="w-[72%] h-[72%] text-slate-100 drop-shadow-[0_0_24px_rgba(148,163,184,0.28)]" />;
    case "iphone16":
      return <Smartphone className="w-[72%] h-[72%] text-sky-200 drop-shadow-[0_0_24px_rgba(96,165,250,0.3)]" />;
    case "trade_signal":
      return <Pickaxe className="w-[72%] h-[72%] text-cyan-200 drop-shadow-[0_0_24px_rgba(34,211,238,0.28)]" />;
    case "whitepaper":
    case "gold_guide":
      return <FileText className="w-[72%] h-[72%] text-indigo-200 drop-shadow-[0_0_24px_rgba(129,140,248,0.3)]" />;
    default:
      return <Gift className="w-[72%] h-[72%] text-rose-200 drop-shadow-[0_0_24px_rgba(244,114,182,0.28)]" />;
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
  const isFailed = !!displayImageSrc && failedSrc === displayImageSrc;
  const frameClass = emphasize
    ? "prize-frame animate-prize-pulse"
    : "prize-frame";

  if (displayImageSrc && !isFailed) {
    return (
      <div className={`relative overflow-hidden ${frameClass} ${className}`} style={style}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-transparent to-transparent pointer-events-none" />
        <img
          src={displayImageSrc}
          alt="Hadiah"
          className="w-full h-full object-contain p-3 [filter:brightness(1.08)_contrast(1.06)_saturate(1.08)_drop-shadow(0_12px_24px_rgba(15,23,42,0.35))]"
          onError={() => setFailedSrc(displayImageSrc)}
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
```

- [ ] **Step 3: 清理主页面背景和弹层底色，让主体更亮、更聚焦**

把 `src\App.tsx` 中这些 className 做替换：

```tsx
<div className="relative mx-4 lg:mx-auto max-w-7xl rounded-3xl mt-6 py-10 md:py-16 panel-premium overflow-hidden select-none">
```

```tsx
<div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-amber-300/14 to-transparent rounded-full blur-[110px] pointer-events-none"></div>
<div className="absolute -top-12 right-1/4 w-[400px] h-[400px] bg-gradient-to-bl from-sky-400/14 to-transparent rounded-full blur-[95px] pointer-events-none"></div>
```

```tsx
<div className="p-6 rounded-3xl panel-premium text-left relative overflow-hidden">
```

```tsx
<div className="bg-slate-950/82 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex-1 flex flex-col text-left shadow-[0_18px_60px_rgba(2,6,23,0.35)] relative overflow-hidden">
```

- [ ] **Step 4: 运行类型检查，确认视觉基底改动没有破坏现有页面**

Run:

```bash
npm run lint
```

Expected: PASS，且没有新增 `PrizeGraphic` props 类型错误

- [ ] **Step 5: 提交这一轮视觉基底改动**

Run:

```bash
git add src/components/PrizeGraphic.tsx src/index.css src/App.tsx
git commit -m "feat: brighten prize presentation and page surfaces"
```

---

### Task 2: 抽离并测试转动节奏，再升级 `UNDI` 按钮和中奖格表现

**Files:**
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\gridSpin.ts`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\gridSpin.test.ts`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\GridLottery.tsx`

- [ ] **Step 1: 先写节奏 helper 的失败测试**

在 `src\utils\gridSpin.test.ts` 写入：

```ts
import { describe, expect, it } from "vitest";
import { buildSpinPlan, getSpinDelay } from "./gridSpin";

describe("grid spin helpers", () => {
  it("ends on the target tile after enough travel", () => {
    const plan = buildSpinPlan({
      currentIndex: 0,
      targetIndex: 5,
      perimeterSize: 8,
      fullLaps: 4,
      slowdownSteps: 8,
    });

    expect(plan.at(-1)).toBe(5);
    expect(plan.length).toBeGreaterThan(30);
  });

  it("slows down near the end of the run", () => {
    const early = getSpinDelay({ step: 2, totalSteps: 40 });
    const late = getSpinDelay({ step: 38, totalSteps: 40 });

    expect(early).toBeLessThan(late);
    expect(late).toBeGreaterThanOrEqual(220);
  });
});
```

- [ ] **Step 2: 运行测试确认 helper 还不存在**

Run:

```bash
npm run test:run -- src/utils/gridSpin.test.ts
```

Expected: FAIL，报错 `Cannot find module './gridSpin'`

- [ ] **Step 3: 写最小可用的节奏 helper**

在 `src\utils\gridSpin.ts` 写入：

```ts
export function buildSpinPlan(params: {
  currentIndex: number;
  targetIndex: number;
  perimeterSize: number;
  fullLaps: number;
  slowdownSteps: number;
}) {
  const { currentIndex, targetIndex, perimeterSize, fullLaps, slowdownSteps } = params;
  const totalTravel =
    fullLaps * perimeterSize +
    ((targetIndex - currentIndex + perimeterSize) % perimeterSize) +
    slowdownSteps;

  const plan: number[] = [];
  for (let step = 1; step <= totalTravel; step += 1) {
    plan.push((currentIndex + step) % perimeterSize);
  }

  if (plan.at(-1) !== targetIndex) {
    const distance = (targetIndex - (plan.at(-1) ?? 0) + perimeterSize) % perimeterSize;
    for (let step = 1; step <= distance; step += 1) {
      plan.push(((plan.at(-1) ?? currentIndex) + 1) % perimeterSize);
    }
  }

  return plan;
}

export function getSpinDelay(params: { step: number; totalSteps: number }) {
  const { step, totalSteps } = params;
  const progress = step / totalSteps;

  if (progress < 0.18) return 42;
  if (progress < 0.68) return 74;
  if (progress < 0.88) return 128;
  if (progress < 0.96) return 186;
  return 248;
}
```

- [ ] **Step 4: 重新运行 helper 测试**

Run:

```bash
npm run test:run -- src/utils/gridSpin.test.ts
```

Expected: PASS

- [ ] **Step 5: 把 `GridLottery` 切换为使用 helper，并重做按钮与中奖格视觉**

把 `src\components\GridLottery.tsx` 按下面结构调整：

```tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Prize, Participant } from "../types";
import { PrizeGraphic } from "./PrizeGraphic";
import { TRANSLATIONS } from "../translations";
import { buildSpinPlan, getSpinDelay } from "../utils/gridSpin";

const PERIMETER_INDEX_MAP = [0, 1, 2, 7, 3, 6, 5, 4];
```

```tsx
const [winningIndex, setWinningIndex] = useState<number | null>(null);
const currentPerimeterIndexRef = useRef(0);
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const targetPerimeterIndex = useMemo(() => {
  if (!drawnResult) return null;
  return gridPrizes.findIndex((p) => p.id === drawnResult.winningPrize.id);
}, [drawnResult, gridPrizes]);
```

```tsx
const runSpinPlan = (result: NonNullable<typeof drawnResult>) => {
  const targetIndex = gridPrizes.findIndex((p) => p.id === result.winningPrize.id);
  if (targetIndex < 0) return;

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
```

把中心按钮替换成：

```tsx
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
  <span className={`relative z-10 text-[32px] sm:text-[36px] font-black tracking-[0.22em] ${isSpinning ? "text-slate-500" : "text-slate-950"}`}>
    {lang === "zh" ? "抽奖" : "UNDI"}
  </span>
  <span className="relative z-10 mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-800/70">
    {isSpinning ? (lang === "zh" ? "Memproses" : "Memproses") : "Lucky Draw"}
  </span>
</button>
```

把格子视觉状态替换成：

```tsx
const isActive = activeIndex === perimeterIdx;
const isWinner = winningIndex === perimeterIdx;
const isDimmed = winningIndex !== null && !isWinner;
```

```tsx
className={`col-span-1 row-span-1 aspect-square rounded-[1.35rem] relative overflow-hidden transition-all duration-200 border ${
  isWinner
    ? "border-amber-300 bg-slate-950/82 scale-[1.08] shadow-[0_0_36px_rgba(251,191,36,0.42)] z-20"
    : isActive
      ? "border-sky-300 bg-slate-950/70 scale-[1.03] shadow-[0_0_28px_rgba(96,165,250,0.35)] z-10"
      : isDimmed
        ? "border-white/6 bg-slate-950/30 opacity-55 scale-[0.98]"
        : "border-white/10 bg-slate-950/58 hover:border-white/18"
}`}
```

并把 `PrizeGraphic` 调整为：

```tsx
<PrizeGraphic
  prizeId={prize.id}
  imageUrl={prize.imageUrl}
  customImageBase64={prize.customImageBase64}
  className="w-full h-full"
  emphasize={isWinner}
/>
```

- [ ] **Step 6: 运行类型检查和节奏测试**

Run:

```bash
npm run test:run -- src/utils/gridSpin.test.ts && npm run lint
```

Expected: 两项都 PASS

- [ ] **Step 7: 提交节奏和 CTA 改动**

Run:

```bash
git add src/utils/gridSpin.ts src/utils/gridSpin.test.ts src/components/GridLottery.tsx
git commit -m "feat: upgrade undi button and readable spin pacing"
```

---

### Task 3: 接入点击后启动的足球音频流程

**Files:**
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\audioState.ts`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\audioState.test.ts`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\public\audio\draw-start.mp3`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\public\audio\draw-spin-loop.mp3`
- Create: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\public\audio\draw-win.mp3`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\utils\audio.ts`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\GridLottery.tsx`

- [ ] **Step 1: 先写音频状态机测试**

在 `src\utils\audioState.test.ts` 写入：

```ts
import { describe, expect, it } from "vitest";
import { transitionAudioPhase } from "./audioState";

describe("transitionAudioPhase", () => {
  it("moves from idle to armed after user gesture", () => {
    expect(transitionAudioPhase("idle", "user-gesture")).toBe("armed");
  });

  it("moves to spinning on spin-start", () => {
    expect(transitionAudioPhase("armed", "spin-start")).toBe("spinning");
  });

  it("moves to win when landing completes", () => {
    expect(transitionAudioPhase("spinning", "spin-win")).toBe("win");
  });

  it("resets to idle after cleanup", () => {
    expect(transitionAudioPhase("win", "reset")).toBe("idle");
  });
});
```

- [ ] **Step 2: 运行测试确认 helper 尚未实现**

Run:

```bash
npm run test:run -- src/utils/audioState.test.ts
```

Expected: FAIL，报错 `Cannot find module './audioState'`

- [ ] **Step 3: 写音频状态机 helper**

在 `src\utils\audioState.ts` 写入：

```ts
export type AudioPhase = "idle" | "armed" | "spinning" | "win";
export type AudioEvent = "user-gesture" | "spin-start" | "spin-win" | "reset";

const TRANSITIONS: Record<AudioPhase, Partial<Record<AudioEvent, AudioPhase>>> = {
  idle: {
    "user-gesture": "armed",
    reset: "idle",
  },
  armed: {
    "spin-start": "spinning",
    reset: "idle",
  },
  spinning: {
    "spin-win": "win",
    reset: "idle",
  },
  win: {
    reset: "idle",
  },
};

export function transitionAudioPhase(
  current: AudioPhase,
  event: AudioEvent,
): AudioPhase {
  return TRANSITIONS[current][event] ?? current;
}
```

- [ ] **Step 4: 重新运行音频状态机测试**

Run:

```bash
npm run test:run -- src/utils/audioState.test.ts
```

Expected: PASS

- [ ] **Step 5: 下载并放入 3 个固定音频文件**

把下面 3 个来源文件下载后统一命名到 `public\audio`：

- `draw-start.mp3`: `https://pixabay.com/sound-effects/musical-football-football-soccer-game-music-08-second-490554/`
- `draw-spin-loop.mp3`: `https://pixabay.com/sound-effects/musical-football-football-soccer-game-music-15-second-490555/`
- `draw-win.mp3`: `https://pixabay.com/sound-effects/people-crowd-cheering-in-stadium-435357/`

Expected: 本地存在以下文件

```text
public/audio/draw-start.mp3
public/audio/draw-spin-loop.mp3
public/audio/draw-win.mp3
```

- [ ] **Step 6: 重写 `audio.ts`，改成点击后激活、分阶段播放、可重置**

把 `src\utils\audio.ts` 改成：

```ts
import { AudioPhase, transitionAudioPhase } from "./audioState";

class AudioEngine {
  private phase: AudioPhase = "idle";
  private startAudio: HTMLAudioElement | null = null;
  private spinAudio: HTMLAudioElement | null = null;
  private winAudio: HTMLAudioElement | null = null;

  private getClip(kind: "start" | "spin" | "win") {
    if (typeof window === "undefined") return null;
    if (kind === "start") {
      this.startAudio ??= new Audio("/audio/draw-start.mp3");
      return this.startAudio;
    }
    if (kind === "spin") {
      this.spinAudio ??= new Audio("/audio/draw-spin-loop.mp3");
      this.spinAudio.loop = true;
      return this.spinAudio;
    }
    this.winAudio ??= new Audio("/audio/draw-win.mp3");
    return this.winAudio;
  }

  private async safePlay(clip: HTMLAudioElement | null) {
    try {
      await clip?.play();
    } catch {
      // Silent fallback keeps draw flow alive.
    }
  }

  primeFromUserGesture() {
    this.phase = transitionAudioPhase(this.phase, "user-gesture");
  }

  async playSpinStart() {
    this.phase = transitionAudioPhase(this.phase, "spin-start");
    const clip = this.getClip("start");
    if (!clip) return;
    clip.currentTime = 0;
    await this.safePlay(clip);
  }

  async startSpinLoop() {
    const clip = this.getClip("spin");
    if (!clip) return;
    clip.currentTime = 0;
    clip.volume = 0.58;
    await this.safePlay(clip);
  }

  async playWinCue() {
    this.phase = transitionAudioPhase(this.phase, "spin-win");
    this.stopSpinLoop();
    const clip = this.getClip("win");
    if (!clip) return;
    clip.currentTime = 0;
    clip.volume = 0.9;
    await this.safePlay(clip);
  }

  stopSpinLoop() {
    const clip = this.getClip("spin");
    if (!clip) return;
    clip.pause();
    clip.currentTime = 0;
  }

  reset() {
    this.phase = transitionAudioPhase(this.phase, "reset");
    this.startAudio?.pause();
    this.spinAudio?.pause();
    this.winAudio?.pause();
    if (this.startAudio) this.startAudio.currentTime = 0;
    if (this.spinAudio) this.spinAudio.currentTime = 0;
    if (this.winAudio) this.winAudio.currentTime = 0;
  }
}

export const audio = new AudioEngine();
```

- [ ] **Step 7: 把 `GridLottery` 的点击流程接上新音频 API**

把 `handleStartSpin` 和落点完成逻辑改成：

```tsx
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
```

```tsx
if (step >= plan.length - 1) {
  void audio.playWinCue();
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
```

并在组件卸载时清理：

```tsx
useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    audio.reset();
  };
}, []);
```

- [ ] **Step 8: 运行测试和类型检查**

Run:

```bash
npm run test:run -- src/utils/audioState.test.ts src/utils/gridSpin.test.ts && npm run lint
```

Expected: 全部 PASS

- [ ] **Step 9: 提交音频流程改动**

Run:

```bash
git add src/utils/audioState.ts src/utils/audioState.test.ts src/utils/audio.ts src/components/GridLottery.tsx public/audio
git commit -m "feat: add click-triggered football audio flow"
```

---

### Task 4: 重做中奖揭晓层和庆祝特效，保证奖品是视觉主角

**Files:**
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\App.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\ConfettiEffect.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\PrizeGraphic.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\index.css`

- [ ] **Step 1: 在 `App.tsx` 中加入更明确的中奖展示状态**

在状态区补充：

```tsx
const [resultRevealOpen, setResultRevealOpen] = useState(false);
```

在 `handleSpinComplete` 成功分支末尾改成：

```tsx
setLastWinAlert({
  prize: actualPrize,
  timestamp: new Date().toISOString(),
});

setResultRevealOpen(false);
window.setTimeout(() => {
  setResultRevealOpen(true);
}, 220);
```

在关闭弹层时同时重置：

```tsx
const closeWinReveal = () => {
  setResultRevealOpen(false);
  setLastWinAlert(null);
  audio.reset();
};
```

- [ ] **Step 2: 把中奖弹层改成“奖品居中、背景退后、信息更干净”的结构**

把 `lastWinAlert` 弹层主体替换成：

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/78 backdrop-blur-md animate-fade-in">
  <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-amber-200/16 bg-[linear-gradient(180deg,rgba(10,18,35,0.96),rgba(6,10,20,0.96))] px-6 py-7 text-center shadow-[0_28px_120px_rgba(2,6,23,0.6)]">
    <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_70%)] pointer-events-none" />
    <button
      onClick={closeWinReveal}
      aria-label={lang === "zh" ? "关闭中奖弹窗" : "Tutup hasil undian"}
      className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      <X className="h-5 w-5" />
    </button>

    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-amber-200">
      <Sparkles className="h-7 w-7" />
    </div>

    <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-gold-soft">
      {lang === "zh" ? "中奖结果" : "Hasil Undian"}
    </p>
    <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
      {t.winTitle}
    </h3>

    <div className="relative my-6 flex items-center justify-center">
      <div className="absolute h-64 w-64 rounded-full bg-amber-300/18 blur-3xl" />
      <div className="absolute h-72 w-72 rounded-full border border-amber-200/18 animate-win-ring" />
      <PrizeGraphic
        prizeId={lastWinAlert.prize.id}
        imageUrl={lastWinAlert.prize.imageUrl}
        customImageBase64={lastWinAlert.prize.customImageBase64}
        className="relative z-10 h-[280px] w-[280px]"
        emphasize
      />
    </div>

    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-200/90">
        {lang === "zh" ? lastWinAlert.prize.levelZh : lastWinAlert.prize.level}
      </p>
      <p className="mt-2 text-xl font-black text-white">
        {lang === "zh" ? lastWinAlert.prize.labelZh : lastWinAlert.prize.label}
      </p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: 把 `ConfettiEffect` 简化为更干净的金色庆祝粒子**

在 `src\components\ConfettiEffect.tsx` 中执行以下调整：

```ts
const colors = ["#F5D77A", "#F8E7A8", "#FFFFFF", "#9FD3FF"];
```

```ts
this.size = 4 + Math.random() * 6;
this.gravity = 0.16 + Math.random() * 0.08;
this.resistance = 0.982;
```

```ts
if (this.shape === "star") this.shape = "rect";
```

```ts
ctx.globalAlpha = this.opacity * 0.82;
```

并把大范围烟花发射频率降低到原来的约一半，确保粒子不遮住中间奖品容器。

- [ ] **Step 4: 运行完整测试与构建**

Run:

```bash
npm run test:run && npm run lint && npm run build
```

Expected: 三项全部 PASS，且 `dist` 正常生成

- [ ] **Step 5: 提交中奖展示与特效改动**

Run:

```bash
git add src/App.tsx src/components/ConfettiEffect.tsx src/components/PrizeGraphic.tsx src/index.css
git commit -m "feat: refine winner reveal and premium celebration"
```

---

### Task 5: 响应式检查和最终调校

**Files:**
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\App.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\components\GridLottery.tsx`
- Modify: `c:\Users\admin\Desktop\remix-kvb-lucky-draw\src\index.css`

- [ ] **Step 1: 启动本地开发环境**

Run:

```bash
npm run dev
```

Expected: Vite 正常启动，本地页面可访问

- [ ] **Step 2: 按下面清单做手动验收**

逐项确认：

- 桌面端和移动端下，奖品图不再发黑，边缘不再被重阴影吞掉
- `UNDI` 按钮有明显按压感、光泽扫光、处理中状态
- 点击前无任何自动播放音频
- 点击后先播 `draw-start.mp3`，转动阶段播 `draw-spin-loop.mp3`
- 落点时 `draw-spin-loop.mp3` 停止，再播 `draw-win.mp3`
- 最终中奖格高亮明确，周围格子有轻微退场感
- 中奖弹层里奖品尺寸足够大，奖品名称和等级可直接识别
- 烟花和彩带不会盖住中间奖品

- [ ] **Step 3: 根据验收结果做最后一轮微调**

只允许微调以下值，不新增结构性功能：

```ts
// src/utils/gridSpin.ts
fullLaps: 4
slowdownSteps: 8
```

```css
/* src/index.css */
--animate-prize-pulse
--animate-undi-sheen
--animate-win-ring
```

```tsx
// src/components/GridLottery.tsx
shadow-[0_18px_40px_rgba(245,158,11,0.35)]
shadow-[0_0_36px_rgba(251,191,36,0.42)]
```

- [ ] **Step 4: 重新执行最终校验**

Run:

```bash
npm run test:run && npm run lint && npm run build
```

Expected: 全部 PASS，且手动验收问题关闭

- [ ] **Step 5: 提交最终调优**

Run:

```bash
git add src/App.tsx src/components/GridLottery.tsx src/index.css src/utils/gridSpin.ts
git commit -m "chore: tune lucky draw visual audio polish"
```

---

## Done Criteria

- 奖品图片在九宫格和中奖弹层里都明显更亮、更清晰
- 背景和主面板不再浑浊，页面主体更聚焦
- `UNDI` 按钮更像印尼常见抽奖 CTA，且有明确 hover、press、processing 状态
- 转动过程能看出起步、巡航、减速、锁定落点
- 音频只在用户点击后开始，不会自动播放，也不会重复叠音
- 中奖瞬间奖品是视觉中心，庆祝特效不遮挡主内容

## Spec Coverage Check

- `PrizeGraphic` 清晰度增强: Task 1, Task 4
- `GridLottery` CTA 与节奏重做: Task 2
- `audio.ts` 三段式播放与点击触发: Task 3
- `App.tsx` 抽奖编排与结果揭晓时机: Task 1, Task 4
- `ConfettiEffect` 精简庆祝粒子: Task 4
- 手动与自动验证: Task 2, Task 3, Task 4, Task 5
