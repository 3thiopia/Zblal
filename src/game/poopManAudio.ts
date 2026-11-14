class PoopManAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private chompToggle = false;

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

  public playCollectRoll() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      this.chompToggle = !this.chompToggle;
      const startFreq = this.chompToggle ? 520 : 420;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq + 160, now + 0.055);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playGoldenBoost() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playHit() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.34);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.37);
    } catch {
      // Ignore Web Audio errors
    }
  }

  public playVictory() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 659.25, 1046.5];
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        const t = now + idx * 0.085;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.055, t);
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

  public playGameOver() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const notes = [392.0, 349.23, 311.13, 261.63];
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = now + idx * 0.13;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.23);
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

export const poopManAudio = new PoopManAudio();
