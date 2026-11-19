/**
 * Pure Procedural Web Audio Engine
 * for SHARD-4: BLACKOUT PROTOCOL
 * 
 * Synthesizes all weapon gunfire, reloads, shell casings, footsteps, explosions,
 * enemy servos, UI beeps, terminal hacking, boss roars, heartbeat, and an adaptive
 * multi-stem synth tension soundtrack using Web Audio API nodes.
 */

export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isMuted: boolean = false;
  private masterVolume: number = 0.8;
  private sfxVolume: number = 0.85;
  private musicVolume: number = 0.45;

  // Music synthesis state
  private musicInterval: any = null;
  private musicStep: number = 0;
  private combatIntensity: number = 0; // 0 (calm) to 1 (frantic)
  private heartbeatOsc: OscillatorNode | null = null;
  private heartbeatGain: GainNode | null = null;

  constructor() {
    // Initialized on first user interaction
  }

  public init(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.startAdaptiveSynthMusic();
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setCombatIntensity(intensity: number): void {
    this.combatIntensity = Math.max(0, Math.min(1, intensity));
  }

  // --- WHITE NOISE GENERATOR ---
  private createNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready');
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // --- 1. WEAPON GUNSHOTS ---
  public playGunshot(type: string): void {
    if (!this.ctx || !this.sfxGain) return;
    this.resume();

    const t = this.ctx.currentTime;

    switch (type) {
      case 'fire_mk4': {
        // MK-IV Pulse Rifle: sharp transient punch + synthesized laser pulse
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }

      case 'fire_sg12': {
        // SG-12 Shotgun: heavy sub-bass boom + filtered noise burst
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(80, t + 0.28);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

        // Sub bass oscillator
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, t);
        sub.frequency.exponentialRampToValueAtTime(35, t + 0.25);
        subGain.gain.setValueAtTime(0.8, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);

        noise.start(t);
        noise.stop(t + 0.32);
        sub.start(t);
        sub.stop(t + 0.25);
        break;
      }

      case 'fire_viper9': {
        // Viper-9 SMG: fast snappy burst
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);

        gain.gain.setValueAtTime(0.38, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }

      case 'fire_railx': {
        // Rail-X Sniper: high-voltage electromagnetic rail crack + deep sonic boom
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1600, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.45);

        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

        // High frequency ionization sizzle
        const sizzle = this.ctx.createOscillator();
        const sizzleGain = this.ctx.createGain();
        sizzle.type = 'sine';
        sizzle.frequency.setValueAtTime(2400, t);
        sizzle.frequency.linearRampToValueAtTime(800, t + 0.2);
        sizzleGain.gain.setValueAtTime(0.4, t);
        sizzleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        sizzle.connect(sizzleGain);
        sizzleGain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.48);
        sizzle.start(t);
        sizzle.stop(t + 0.2);
        break;
      }

      case 'fire_p45':
      default: {
        // P-45 Sidearm
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(480, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);

        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
        break;
      }
    }
  }

  // --- 2. RELOADS & SHELL CASINGS ---
  public playReload(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playShellDrop(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime + 0.15; // Small delay after shot
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200 + Math.random() * 400, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playEmptyClick(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // --- 3. FOOTSTEPS & DODGE WHOOSH ---
  public playFootstep(isCrouched: boolean): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.06);

    const vol = isCrouched ? 0.05 : 0.15;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playDodgeWhoosh(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(900, t + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.25);
  }

  public playShieldDeflect(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // --- 4. EXPLOSIONS & DETONATIONS ---
  public playExplosion(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(50, t + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(100, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 0.6);
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.8);
    sub.start(t);
    sub.stop(t + 0.65);
  }

  // --- 5. UI BLIPS, HACKING & BOSS ROARS ---
  public playTerminalBeep(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t); // High A6 beep

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playShardUnlockedSound(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = t + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + 0.28);
    });
  }

  public playBossRoar(): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.linearRampToValueAtTime(55, t + 1.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, t);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 1.4);
  }

  // --- 6. LOW HP HEARTBEAT ---
  public updateHeartbeat(isLowHp: boolean): void {
    if (!this.ctx || !this.sfxGain) return;

    if (isLowHp) {
      if (!this.heartbeatOsc) {
        this.heartbeatOsc = this.ctx.createOscillator();
        this.heartbeatGain = this.ctx.createGain();
        this.heartbeatOsc.type = 'sine';
        this.heartbeatOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

        this.heartbeatGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        this.heartbeatOsc.connect(this.heartbeatGain);
        this.heartbeatGain.connect(this.sfxGain);
        this.heartbeatOsc.start();
      }
    } else {
      if (this.heartbeatOsc) {
        try {
          this.heartbeatOsc.stop();
          this.heartbeatOsc.disconnect();
        } catch (e) {
          // ignore
        }
        this.heartbeatOsc = null;
        this.heartbeatGain = null;
      }
    }
  }

  // --- 7. ADAPTIVE PROCEDURAL SYNTH SOUNDTRACK ---
  private startAdaptiveSynthMusic(): void {
    if (!this.ctx || !this.musicGain) return;

    // Dark cyberpunk synth scale: C minor (C, D#, F, G, A#)
    const bassScale = [65.41, 77.78, 87.31, 98.0, 116.54]; // C2, Eb2, F2, G2, Bb2
    const leadScale = [261.63, 311.13, 349.23, 392.0, 466.16]; // C4, Eb4, F4, G4, Bb4

    const stepInterval = 250; // 16th note arpeggiation at 120 BPM

    this.musicInterval = setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;

      const t = this.ctx.currentTime;
      this.musicStep = (this.musicStep + 1) % 16;

      // Bass note on beats 0, 4, 8, 12
      if (this.musicStep % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';

        const rootIndex = (Math.floor(this.musicStep / 4)) % bassScale.length;
        bassOsc.frequency.setValueAtTime(bassScale[rootIndex], t);

        const bassVol = 0.22 + this.combatIntensity * 0.15;
        bassGain.gain.setValueAtTime(bassVol, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(t);
        bassOsc.stop(t + 0.38);
      }

      // Arpeggiated lead (ramps in volume and speed as combat intensity increases)
      if (this.combatIntensity > 0.15 && this.musicStep % 2 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'triangle';

        const note = leadScale[this.musicStep % leadScale.length];
        leadOsc.frequency.setValueAtTime(note, t);

        const leadVol = this.combatIntensity * 0.18;
        leadGain.gain.setValueAtTime(leadVol, t);
        leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);
        leadOsc.start(t);
        leadOsc.stop(t + 0.2);
      }
    }, stepInterval);
  }

  public destroy(): void {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.heartbeatOsc) {
      try {
        this.heartbeatOsc.stop();
      } catch (e) {
        // ignore
      }
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audio = new ProceduralAudioEngine();
