/**
 * Web Audio API synthesizer for meditation practice chimes and alarms.
 * Self-contained, zero external asset dependency, works smoothly on Mobile Safari and Chrome.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Unlock AudioContext on first user touch/click (required by iOS Safari)
   */
  public unlockAudio(): void {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  /**
   * Play a peaceful resonant singing bowl / temple bell chime ("ติ๊ง")
   * Used every 10 minutes in count-up timer
   */
  public playTenMinuteChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Fundamental pitch ~528 Hz (Solfeggio love/peace frequency) + Overtones
      const frequencies = [528, 1056, 1584];
      const gains = [0.4, 0.15, 0.05];

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Exponential decay for realistic bell resonance
        gainNode.gain.setValueAtTime(gains[index], now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 3.5);
      });
    } catch {
      // Audio playback fails gracefully if browser blocks autoplay
    }
  }

  /**
   * Play completion alarm ("ติ๊ดๆ ติ๊ดๆ" / Serene rhythmic meditation gong)
   * Used when count-down reaches 00:00:00
   */
  public playCompletionAlarm(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const pulses = [0, 0.4, 0.8, 1.4, 1.8, 2.2];

      pulses.forEach((offset) => {
        const pulseTime = now + offset;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, pulseTime);
        osc.frequency.exponentialRampToValueAtTime(440, pulseTime + 0.3);

        gainNode.gain.setValueAtTime(0.35, pulseTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.35);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(pulseTime);
        osc.stop(pulseTime + 0.4);
      });
    } catch {
      // Audio playback fails gracefully if browser blocks autoplay
    }
  }
}

export const soundService = new SoundService();
