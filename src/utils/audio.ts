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

  // Compatibility shims for older callers outside the Task3 GridLottery flow.
  playTick() {
    this.primeFromUserGesture();
  }

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
