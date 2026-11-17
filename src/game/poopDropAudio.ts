class PoopDropAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(nextMuted: boolean) {
    this.muted = nextMuted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playDropWhoosh() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playSplashScore(isMilestone = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // Water "bloop" bubble pop
      const bloop = ctx.createOscillator();
      const bloopGain = ctx.createGain();
      bloop.type = 'sine';
      bloop.frequency.setValueAtTime(260, now);
      bloop.frequency.exponentialRampToValueAtTime(680, now + 0.09);
      bloopGain.gain.setValueAtTime(0.11, now);
      bloopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      bloop.connect(bloopGain);
      bloopGain.connect(ctx.destination);
      bloop.start(now);
      bloop.stop(now + 0.12);

      // Cheerful score chime
      const notes = isMilestone ? [587.33, 783.99, 1046.5] : [523.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + 0.05 + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playSplatMiss() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.28);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);

      const boing = ctx.createOscillator();
      const boingGain = ctx.createGain();
      boing.type = 'triangle';
      boing.frequency.setValueAtTime(190, now + 0.08);
      boing.frequency.exponentialRampToValueAtTime(110, now + 0.35);
      boingGain.gain.setValueAtTime(0.07, now + 0.08);
      boingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.37);
      boing.connect(boingGain);
      boingGain.connect(ctx.destination);
      boing.start(now + 0.08);
      boing.stop(now + 0.38);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public dispose() {
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        // Ignore close errors
      }
      this.ctx = null;
    }
  }
}

export const poopDropAudio = new PoopDropAudio();
