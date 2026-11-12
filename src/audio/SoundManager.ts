/**
 * Procedural Web Audio synthesizer for realistic engine sounds,
 * tire screeching, nitro burn, collisions, and race events.
 * 100% zero external audio dependencies.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sfxVolume: number = 0.8;
  private engineVolume: number = 0.7;

  // Engine synth nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  // Tire screech synth nodes
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireFilterNode: BiquadFilterNode | null = null;
  private tireGainNode: GainNode | null = null;

  // Nitro whoosh nodes
  private nitroGainNode: GainNode | null = null;
  private nitroNoiseNode: AudioBufferSourceNode | null = null;

  private currentSoundType: string = 'v8';

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolumes(sfx: number, engine: number) {
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.engineVolume = Math.max(0, Math.min(1, engine));
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(this.isEngineRunning ? this.engineVolume * 0.25 : 0, this.ctx.currentTime, 0.05);
    }
  }

  public startEngine(soundType: 'v8' | 'v10' | 'bike' | 'scooter' | 'diesel' | 'electric' | 'rotary' | 'turbo4' = 'v8') {
    this.initContext();
    if (!this.ctx) return;
    this.stopEngine();

    this.currentSoundType = soundType;

    const ctx = this.ctx;
    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc2 = ctx.createOscillator();
    this.engineSubOsc = ctx.createOscillator();
    this.engineFilter = ctx.createBiquadFilter();
    this.engineGain = ctx.createGain();

    if (soundType === 'electric') {
      this.engineOsc1.type = 'sine';
      this.engineOsc2.type = 'triangle';
      this.engineSubOsc.type = 'sine';
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 800;
    } else if (soundType === 'v10') {
      // Screaming Formula / Supercar
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'sawtooth';
      this.engineSubOsc.type = 'triangle';
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 2400;
      this.engineFilter.Q.value = 4.0;
    } else if (soundType === 'bike') {
      // High-rev motorcycle
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'square';
      this.engineSubOsc.type = 'sawtooth';
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 1800;
    } else if (soundType === 'scooter') {
      this.engineOsc1.type = 'square';
      this.engineOsc2.type = 'sawtooth';
      this.engineSubOsc.type = 'triangle';
      this.engineFilter.type = 'bandpass';
      this.engineFilter.frequency.value = 650;
      this.engineFilter.Q.value = 2.0;
    } else if (soundType === 'diesel') {
      // Monster / Heavy truck
      this.engineOsc1.type = 'triangle';
      this.engineOsc2.type = 'sawtooth';
      this.engineSubOsc.type = 'sawtooth';
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 600;
    } else {
      // V8 Muscle / Sports
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'triangle';
      this.engineSubOsc.type = 'sawtooth';
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 1100;
      this.engineFilter.Q.value = 2.0;
    }

    const baseFreq = soundType === 'v10' ? 65 : soundType === 'bike' ? 70 : soundType === 'diesel' ? 32 : soundType === 'scooter' ? 85 : 45;
    this.engineOsc1.frequency.value = baseFreq;
    this.engineOsc2.frequency.value = baseFreq * 1.5;
    this.engineSubOsc.frequency.value = baseFreq * 0.5;

    // Connect nodes
    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(ctx.destination);

    this.engineGain.gain.setValueAtTime(this.engineVolume * 0.25, ctx.currentTime);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSubOsc.start();
    this.isEngineRunning = true;

    // Init tire screech noise chain
    this.initTireScreech();
  }

  public updateEngine(rpmRatio: number, throttle: number) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineSubOsc || !this.engineFilter) return;

    const clampedRpm = Math.max(0.1, Math.min(1.0, rpmRatio));
    const now = this.ctx.currentTime;

    let baseFreq = 45;
    let multiplier = 4.0;
    if (this.currentSoundType === 'v10') {
      baseFreq = 65;
      multiplier = 7.5;
    } else if (this.currentSoundType === 'bike') {
      baseFreq = 70;
      multiplier = 6.0;
    } else if (this.currentSoundType === 'scooter') {
      baseFreq = 90;
      multiplier = 4.0;
    } else if (this.currentSoundType === 'diesel') {
      baseFreq = 30;
      multiplier = 3.5;
    } else if (this.currentSoundType === 'electric') {
      baseFreq = 80;
      multiplier = 8.0;
    }

    const targetFreq = baseFreq + clampedRpm * baseFreq * multiplier + (throttle > 0 ? 12 : 0);
    this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.503, now, 0.04);
    this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);

    const filterTarget = 400 + clampedRpm * 2200 + (throttle > 0 ? 600 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterTarget, now, 0.05);

    if (this.engineGain) {
      const vol = this.engineVolume * (0.18 + clampedRpm * 0.22 + (throttle > 0 ? 0.08 : 0));
      this.engineGain.gain.setTargetAtTime(vol, now, 0.05);
    }
  }

  public stopEngine() {
    if (this.engineOsc1) {
      try {
        this.engineOsc1.stop();
        this.engineOsc2?.stop();
        this.engineSubOsc?.stop();
        this.engineOsc1.disconnect();
        this.engineOsc2?.disconnect();
        this.engineSubOsc?.disconnect();
        this.engineFilter?.disconnect();
        this.engineGain?.disconnect();
      } catch {
        // ignore
      }
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineSubOsc = null;
      this.engineFilter = null;
      this.engineGain = null;
    }
    this.isEngineRunning = false;
    this.stopTireScreech();
    this.stopNitro();
  }

  private initTireScreech() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.tireNoiseNode = ctx.createBufferSource();
    this.tireNoiseNode.buffer = buffer;
    this.tireNoiseNode.loop = true;

    this.tireFilterNode = ctx.createBiquadFilter();
    this.tireFilterNode.type = 'bandpass';
    this.tireFilterNode.frequency.value = 1600;
    this.tireFilterNode.Q.value = 3.5;

    this.tireGainNode = ctx.createGain();
    this.tireGainNode.gain.setValueAtTime(0, ctx.currentTime);

    this.tireNoiseNode.connect(this.tireFilterNode);
    this.tireFilterNode.connect(this.tireGainNode);
    this.tireGainNode.connect(ctx.destination);

    this.tireNoiseNode.start();
  }

  public updateTireScreech(slipIntensity: number) {
    if (!this.ctx || !this.tireGainNode) return;
    const targetGain = Math.min(1.0, Math.max(0, slipIntensity)) * this.sfxVolume * 0.35;
    this.tireGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.06);
  }

  private stopTireScreech() {
    if (this.tireNoiseNode) {
      try {
        this.tireNoiseNode.stop();
        this.tireNoiseNode.disconnect();
      } catch {
        // ignore
      }
      this.tireNoiseNode = null;
    }
  }

  public playNitro(active: boolean) {
    this.initContext();
    if (!this.ctx) return;

    if (active) {
      if (!this.nitroGainNode) {
        const ctx = this.ctx;
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        this.nitroNoiseNode = ctx.createBufferSource();
        this.nitroNoiseNode.buffer = buffer;
        this.nitroNoiseNode.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 900;

        this.nitroGainNode = ctx.createGain();
        this.nitroGainNode.gain.setValueAtTime(0, ctx.currentTime);

        this.nitroNoiseNode.connect(filter);
        filter.connect(this.nitroGainNode);
        this.nitroGainNode.connect(ctx.destination);
        this.nitroNoiseNode.start();
      }
      if (this.nitroGainNode) {
        this.nitroGainNode.gain.setTargetAtTime(this.sfxVolume * 0.3, this.ctx.currentTime, 0.08);
      }
    } else {
      if (this.nitroGainNode) {
        this.nitroGainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }
  }

  public stopNitro() {
    if (this.nitroNoiseNode) {
      try {
        this.nitroNoiseNode.stop();
        this.nitroNoiseNode.disconnect();
      } catch {
        // ignore
      }
      this.nitroNoiseNode = null;
      this.nitroGainNode = null;
    }
  }

  public playCollision(forceRatio: number = 0.5) {
    this.initContext();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const intensity = Math.min(1.0, Math.max(0.1, forceRatio));

    // Thud sine impact
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 * intensity, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    gain.gain.setValueAtTime(this.sfxVolume * 0.6 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);

    // Crunch noise
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.15), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.sfxVolume * 0.45 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);
  }

  public playCountdown(isGo: boolean = false) {
    this.initContext();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

    gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.2));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isGo ? 0.6 : 0.2));
  }

  public playCheckpoint() {
    this.initContext();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playVictory() {
    this.initContext();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  public playCoin() {
    this.initContext();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playClick() {
    this.initContext();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(this.sfxVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const soundManager = new SoundManager();
