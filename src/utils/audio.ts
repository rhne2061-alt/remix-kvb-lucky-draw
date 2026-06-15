import { AudioPhase, transitionAudioPhase } from "./audioState";

class AudioEngine {
  private phase: AudioPhase = "idle";
  private startAudio: HTMLAudioElement | null = null;
  private spinAudio: HTMLAudioElement | null = null;
  private winAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private tickIndex = 0;

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

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.audioCtx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.audioCtx.state === "suspended") {
      void this.audioCtx.resume().catch(() => undefined);
    }
    return this.audioCtx;
  }

  primeFromUserGesture() {
    this.phase = transitionAudioPhase(this.phase, "user-gesture");
    // Some browsers (Chrome) require an AudioContext resume *during* the
    // user gesture. Calling resume here keeps the subsequent play() calls
    // from being blocked by the autoplay policy.
    this.ensureCtx();
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

  // === FIX: previously `playTick` only primed the audio context, which
  //             meant the operator button click was silent. Now we emit a
  //             short WebAudio "tick" so the user always hears feedback. ===
  async playTick() {
    this.primeFromUserGesture();
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseFreq = 720 + (this.tickIndex % 3) * 60;
      this.tickIndex += 1;
      osc.frequency.value = baseFreq;
      osc.type = "square";
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Best-effort: ignore WebAudio failures and stay silent.
    }
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

  // Compatibility shims for older callers outside the Task3 GridLottery flow.
  playSuccess() {
    void this.playWinCue();
  }

  playDecline() {
    this.reset();
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
