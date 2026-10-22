// Pure Web Audio API Soundscape Generator (Rain, Brown Noise / Cafe, Ocean Waves, Lo-Fi Synth).
// Lightweight, offline, zero audio asset downloads needed.

export type SoundscapeMode = "none" | "rain" | "cafe" | "ocean" | "lofi";

class SoundscapeManager {
  private ctx: AudioContext | null = null;
  private mode: SoundscapeMode = "none";
  private volume: number = 0.5;
  private isPlaying: boolean = false;
  private masterGain: GainNode | null = null;

  // Active audio nodes
  private noiseNode: AudioNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private lofiInterval: number | null = null;

  private listeners: Set<(state: { mode: SoundscapeMode; isPlaying: boolean; volume: number }) => void> = new Set();

  constructor() {
    // Lazy init audio context on first user action
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  getState() {
    return {
      mode: this.mode,
      isPlaying: this.isPlaying,
      volume: this.volume,
    };
  }

  subscribe(fn: (s: { mode: SoundscapeMode; isPlaying: boolean; volume: number }) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const s = this.getState();
    for (const l of this.listeners) {
      try {
        l(s);
      } catch (err) {
        console.error("[soundscape] listener error", err);
      }
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  setMode(mode: SoundscapeMode) {
    if (this.mode === mode && this.isPlaying) return;
    this.stopNodes();
    this.mode = mode;
    if (mode === "none") {
      this.isPlaying = false;
      this.notify();
      return;
    }
    this.isPlaying = true;
    this.startMode(mode);
    this.notify();
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  play() {
    if (this.mode === "none") {
      this.setMode("rain");
    } else {
      this.setMode(this.mode);
    }
  }

  stop() {
    this.isPlaying = false;
    this.stopNodes();
    this.notify();
  }

  private stopNodes() {
    if (this.lofiInterval != null) {
      clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
    if (this.noiseNode) {
      try {
        this.noiseNode.disconnect();
      } catch {}
      this.noiseNode = null;
    }
    if (this.filterNode) {
      try {
        this.filterNode.disconnect();
      } catch {}
      this.filterNode = null;
    }
    if (this.lfoNode) {
      try {
        this.lfoNode.stop();
        this.lfoNode.disconnect();
      } catch {}
      this.lfoNode = null;
    }
  }

  private startMode(mode: SoundscapeMode) {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    if (mode === "rain") {
      this.setupRain();
    } else if (mode === "cafe") {
      this.setupBrownNoise();
    } else if (mode === "ocean") {
      this.setupOcean();
    } else if (mode === "lofi") {
      this.setupLoFi();
    }
  }

  // 1. Rain Synthesizer (Pink Noise + Lowpass + random droplet pops)
  private setupRain() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Pink noise generation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.masterGain);
    whiteNoise.start();

    this.noiseNode = whiteNoise;
    this.filterNode = filter;
  }

  // 2. Brown Noise / Cozy Cafe Ambience
  private setupBrownNoise() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const brownNoise = this.ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    brownNoise.connect(filter);
    filter.connect(this.masterGain);
    brownNoise.start();

    this.noiseNode = brownNoise;
    this.filterNode = filter;
  }

  // 3. Ocean Waves (Modulated Filter Noise)
  private setupOcean() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.25;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.Q.setValueAtTime(2, this.ctx.currentTime);

    // LFO to slowly sweep frequency like ocean swells
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // 1 swell every ~8 seconds

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(this.masterGain);

    noise.start();
    lfo.start();

    this.noiseNode = noise;
    this.filterNode = filter;
    this.lfoNode = lfo;
  }

  // 4. Lo-Fi Procedural Synth Chords & Vinyl Warmth
  private setupLoFi() {
    if (!this.ctx || !this.masterGain) return;

    // Gentle warm vinyl noise background
    this.setupBrownNoise();

    // Mellow jazzy 7th chord progressions (frequencies in Hz)
    // Cmaj7 (C4, E4, G4, B4), Am7 (A3, C4, E4, G4), Fmaj7 (F3, A3, C4, E4), G7 (G3, B3, D4, F4)
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      const now = this.ctx.currentTime;
      for (const freq of currentChord) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filt = this.ctx.createBiquadFilter();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        filt.type = "lowpass";
        filt.frequency.setValueAtTime(650, now);

        // Soft ADSR envelope
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.04, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc.connect(filt);
        filt.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 4.0);
      }
    };

    playChord();
    this.lofiInterval = window.setInterval(playChord, 4200);
  }
}

export const Soundscape = new SoundscapeManager();
