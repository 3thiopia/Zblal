class ToiletBasketballAudio {
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

  public playLaunchWhoosh() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.14);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playRimBounce() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playSwishSplash(isCleanSwish: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const bloop = ctx.createOscillator();
      const bloopGain = ctx.createGain();
      bloop.type = 'sine';
      bloop.frequency.setValueAtTime(290, now);
      bloop.frequency.exponentialRampToValueAtTime(760, now + 0.1);
      bloopGain.gain.setValueAtTime(0.11, now);
      bloopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      bloop.connect(bloopGain);
      bloopGain.connect(ctx.destination);
      bloop.start(now);
      bloop.stop(now + 0.13);

      const notes = isCleanSwish
        ? [587.33, 783.99, 1046.5]
        : [523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + 0.04 + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.17);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playMissPlop() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(230, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.24);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.27);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playGameOver() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [340, 260, 180].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + i * 0.11;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.19);
      });
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

export const toiletBasketballAudio = new ToiletBasketballAudio();
