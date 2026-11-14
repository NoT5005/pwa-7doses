/**
 * High-reliability meditation sound synthesizer & mobile audio engine.
 * Combines in-memory 16-bit PCM WAV HTML5 <audio> playback with Web Audio API fallback
 * and a silent keep-alive loop so 10-minute chimes ring reliably on iPhone (Safari/PWA) and Android.
 */

function encodeWavFromSamples(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16 bits

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Generate a clear, warm, resonant temple singing bowl / bell strike (~3.4s)
 */
function buildBellChimeWavUrl(): string {
  const sampleRate = 44100;
  const durationSec = 3.4;
  const length = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(length);

  // Two gentle resonant strikes (primary strike at 0s, soft echo strike at 1.15s) so it's unmistakable for seniors
  const strikes = [
    { startSec: 0.0, amp: 1.0 },
    { startSec: 1.15, amp: 0.75 },
  ];

  // Rich singing bowl partials (warm 528Hz fundamental + body 264Hz + clear 792Hz & 1056Hz overtones + strike transient)
  const partials = [
    { freq: 264, weight: 0.22, decay: 1.4 },
    { freq: 528, weight: 0.55, decay: 1.25 },
    { freq: 792, weight: 0.28, decay: 1.9 },
    { freq: 1056, weight: 0.2, decay: 2.5 },
    { freq: 1584, weight: 0.08, decay: 4.0 },
  ];

  for (const strike of strikes) {
    const startIdx = Math.floor(strike.startSec * sampleRate);
    for (let i = startIdx; i < length; i++) {
      const t = (i - startIdx) / sampleRate;
      // Fast smooth attack (6ms) to avoid speaker click
      const attack = Math.min(1, t / 0.006);
      let sample = 0;
      for (const p of partials) {
        sample += p.weight * Math.sin(2 * Math.PI * p.freq * t) * Math.exp(-p.decay * t);
      }
      samples[i] += sample * attack * strike.amp;
    }
  }

  // Normalize peak to 0.88 for crisp, loud-enough clarity without clipping
  let maxAbs = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxAbs) maxAbs = abs;
  }
  if (maxAbs > 0) {
    const scale = 0.88 / maxAbs;
    for (let i = 0; i < length; i++) {
      samples[i] *= scale;
    }
  }

  // Gentle fade-out on last 80ms
  const fadeSamples = Math.floor(0.08 * sampleRate);
  for (let i = 0; i < fadeSamples; i++) {
    const idx = length - 1 - i;
    samples[idx] *= i / fadeSamples;
  }

  return URL.createObjectURL(encodeWavFromSamples(samples, sampleRate));
}

/**
 * Generate completion gong sequence (3 serene temple strikes ~4.2s)
 */
function buildCompletionGongWavUrl(): string {
  const sampleRate = 44100;
  const durationSec = 4.2;
  const length = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(length);

  const strikes = [
    { startSec: 0.0, baseFreq: 440, amp: 0.9 },
    { startSec: 1.1, baseFreq: 528, amp: 0.95 },
    { startSec: 2.2, baseFreq: 660, amp: 1.0 },
  ];

  for (const strike of strikes) {
    const startIdx = Math.floor(strike.startSec * sampleRate);
    for (let i = startIdx; i < length; i++) {
      const t = (i - startIdx) / sampleRate;
      const attack = Math.min(1, t / 0.006);
      const wave =
        0.55 * Math.sin(2 * Math.PI * strike.baseFreq * t) * Math.exp(-1.5 * t) +
        0.3 * Math.sin(2 * Math.PI * strike.baseFreq * 1.5 * t) * Math.exp(-2.2 * t) +
        0.15 * Math.sin(2 * Math.PI * strike.baseFreq * 2 * t) * Math.exp(-3.0 * t);
      samples[i] += wave * attack * strike.amp;
    }
  }

  let maxAbs = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxAbs) maxAbs = abs;
  }
  if (maxAbs > 0) {
    const scale = 0.9 / maxAbs;
    for (let i = 0; i < length; i++) {
      samples[i] *= scale;
    }
  }

  return URL.createObjectURL(encodeWavFromSamples(samples, sampleRate));
}

/**
 * Generate a tiny inaudible WAV loop (2s) to keep mobile browser audio pipeline awake
 * during 10-minute quiet meditation periods.
 */
function buildSilentKeepAliveWavUrl(): string {
  const sampleRate = 8000;
  const length = sampleRate * 2;
  const samples = new Float32Array(length);
  // Imperceptible ultra-low amplitude so OS doesn't optimize away zero-filled stream
  for (let i = 0; i < length; i++) {
    samples[i] = (i % 2 === 0 ? 1 : -1) * 0.00003;
  }
  return URL.createObjectURL(encodeWavFromSamples(samples, sampleRate));
}

class SoundService {
  private audioCtx: AudioContext | null = null;
  private chimeUrl: string | null = null;
  private alarmUrl: string | null = null;
  private keepAliveUrl: string | null = null;

  private chimeAudio: HTMLAudioElement | null = null;
  private alarmAudio: HTMLAudioElement | null = null;
  private keepAliveAudio: HTMLAudioElement | null = null;

  private configureAudioSession(): void {
    if (typeof navigator === 'undefined') return;
    try {
      // iOS 17+ AudioSession API: 'playback' allows meditation chimes to sound even when silent switch is on
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) {
        nav.audioSession.type = 'playback';
      }
    } catch {
      // Ignore if unsupported
    }
  }

  private ensureAudioElements(): void {
    if (typeof window === 'undefined') return;
    this.configureAudioSession();

    if (!this.chimeUrl) {
      this.chimeUrl = buildBellChimeWavUrl();
    }
    if (!this.alarmUrl) {
      this.alarmUrl = buildCompletionGongWavUrl();
    }
    if (!this.keepAliveUrl) {
      this.keepAliveUrl = buildSilentKeepAliveWavUrl();
    }

    if (!this.chimeAudio) {
      this.chimeAudio = new Audio(this.chimeUrl);
      this.chimeAudio.preload = 'auto';
    }
    if (!this.alarmAudio) {
      this.alarmAudio = new Audio(this.alarmUrl);
      this.alarmAudio.preload = 'auto';
    }
    if (!this.keepAliveAudio) {
      this.keepAliveAudio = new Audio(this.keepAliveUrl);
      this.keepAliveAudio.loop = true;
      this.keepAliveAudio.volume = 0.01;
      this.keepAliveAudio.preload = 'auto';
    }
  }

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
    return this.audioCtx;
  }

  /**
   * Unlock Audio on user tap (must be called directly inside click/touch handler)
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    this.ensureAudioElements();

    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Prime chime & alarm audio elements on user gesture without audible sound
    if (this.chimeAudio && this.chimeAudio.paused) {
      const prevVol = this.chimeAudio.volume;
      this.chimeAudio.volume = 0;
      this.chimeAudio
        .play()
        .then(() => {
          if (this.chimeAudio) {
            this.chimeAudio.pause();
            this.chimeAudio.currentTime = 0;
            this.chimeAudio.volume = prevVol;
          }
        })
        .catch(() => {
          if (this.chimeAudio) this.chimeAudio.volume = prevVol;
        });
    }
  }

  /**
   * Keep mobile audio pipeline active while timer is actively running
   */
  public startKeepAlive(): void {
    if (typeof window === 'undefined') return;
    this.ensureAudioElements();
    if (this.keepAliveAudio && this.keepAliveAudio.paused) {
      this.keepAliveAudio.play().catch(() => {});
    }
  }

  /**
   * Stop silent keep-alive when timer is paused or stopped
   */
  public stopKeepAlive(): void {
    if (this.keepAliveAudio && !this.keepAliveAudio.paused) {
      this.keepAliveAudio.pause();
      this.keepAliveAudio.currentTime = 0;
    }
  }

  /**
   * Fallback Web Audio synthesizer if HTML5 <audio> fails
   */
  private playWebAudioFallbackBell(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const schedule = () => {
      try {
        const now = ctx.currentTime;
        const frequencies = [264, 528, 792, 1056];
        const gains = [0.2, 0.45, 0.22, 0.12];

        [0, 1.15].forEach((strikeOffset, sIdx) => {
          const strikeScale = sIdx === 0 ? 1 : 0.75;
          frequencies.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const t0 = now + strikeOffset;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t0);

            gainNode.gain.setValueAtTime(gains[index] * strikeScale, t0);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(t0);
            osc.stop(t0 + 2.5);
          });
        });
      } catch {
        // Ignore if blocked
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(schedule).catch(() => {});
    } else {
      schedule();
    }
  }

  /**
   * Play the 10-minute temple bell chime ("ติ๊ง... ติ๊ง...")
   */
  public async playTenMinuteChime(): Promise<void> {
    if (typeof window === 'undefined') return;
    this.ensureAudioElements();

    if (this.chimeAudio) {
      try {
        this.chimeAudio.volume = 1.0;
        this.chimeAudio.currentTime = 0;
        await this.chimeAudio.play();
        return;
      } catch {
        // Fall through to Web Audio synthesizer
      }
    }

    this.playWebAudioFallbackBell();
  }

  /**
   * Play test chime from user tap so user can check & adjust volume before practicing
   */
  public async playTestChime(): Promise<void> {
    this.configureAudioSession();
    this.ensureAudioElements();
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    await this.playTenMinuteChime();
  }

  /**
   * Play completion alarm when count-down reaches 00:00:00
   */
  public async playCompletionAlarm(): Promise<void> {
    if (typeof window === 'undefined') return;
    this.ensureAudioElements();

    if (this.alarmAudio) {
      try {
        this.alarmAudio.volume = 1.0;
        this.alarmAudio.currentTime = 0;
        await this.alarmAudio.play();
        return;
      } catch {
        // Fall through to Web Audio fallback
      }
    }

    this.playWebAudioFallbackBell();
  }
}

export const soundService = new SoundService();
