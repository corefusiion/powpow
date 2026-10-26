// Offline, Multi-Track Generative Soundscape & Lo-Fi Player.
// Real Web Audio API sound synthesis with full playlist, track skipping, and controls.

export type SoundscapeStyle = "lofi" | "piano" | "rain" | "ambient" | "ocean" | "acoustic";

export interface SoundscapeTrack {
  id: string;
  title: string;
  style: SoundscapeStyle;
  styleLabel: string;
  artist: string;
  duration: number; // in seconds
}

export interface SoundscapePlayerState {
  isPlaying: boolean;
  currentStyle: SoundscapeStyle;
  currentTrack: SoundscapeTrack;
  currentTime: number;
  duration: number;
  volume: number;
  trackIndex: number;
  totalTracks: number;
}

export const SOUNDSCAPE_CATALOG: Record<SoundscapeStyle, SoundscapeTrack[]> = {
  lofi: [
    {
      id: "lofi-1",
      title: "Midnight Rain & Chillhop",
      style: "lofi",
      styleLabel: "Lo-Fi Beats",
      artist: "Powpow Chill Radio",
      duration: 195,
    },
    {
      id: "lofi-2",
      title: "Coffeehouse Warmth",
      style: "lofi",
      styleLabel: "Lo-Fi Beats",
      artist: "Vintage Vinyl Session",
      duration: 210,
    },
    {
      id: "lofi-3",
      title: "Sunset Balcony Groove",
      style: "lofi",
      styleLabel: "Lo-Fi Beats",
      artist: "Lofi Study Session",
      duration: 180,
    },
  ],
  piano: [
    {
      id: "piano-1",
      title: "Nocturne in C Minor",
      style: "piano",
      styleLabel: "Piano Acústico",
      artist: "Calm Solitude",
      duration: 220,
    },
    {
      id: "piano-2",
      title: "Quiet Rain On Glass",
      style: "piano",
      styleLabel: "Piano Acústico",
      artist: "Minimalist Keys",
      duration: 200,
    },
    {
      id: "piano-3",
      title: "Morning Light Reverie",
      style: "piano",
      styleLabel: "Piano Acústico",
      artist: "Gentle Harmony",
      duration: 240,
    },
  ],
  rain: [
    {
      id: "rain-1",
      title: "Chuva Suave na Janela",
      style: "rain",
      styleLabel: "Chuva & Natureza",
      artist: "Soundscape Pure",
      duration: 300,
    },
    {
      id: "rain-2",
      title: "Cafeteria em Dia Chuvoso",
      style: "rain",
      styleLabel: "Chuva & Café",
      artist: "Urban Ambience",
      duration: 270,
    },
  ],
  ambient: [
    {
      id: "ambient-1",
      title: "Deep Space Focus",
      style: "ambient",
      styleLabel: "Synth Cósmico",
      artist: "Cosmic Drone",
      duration: 250,
    },
    {
      id: "ambient-2",
      title: "Alpha Waves Flow",
      style: "ambient",
      styleLabel: "Deep Focus",
      artist: "Mind Calm Flow",
      duration: 280,
    },
  ],
  ocean: [
    {
      id: "ocean-1",
      title: "Ondas Suaves na Praia",
      style: "ocean",
      styleLabel: "Ondas do Mar",
      artist: "Coastal Breeze",
      duration: 320,
    },
  ],
  acoustic: [
    {
      id: "acoustic-1",
      title: "Violão Suave de Fim de Tarde",
      style: "acoustic",
      styleLabel: "Violão Relaxante",
      artist: "Acoustic Serenity",
      duration: 190,
    },
    {
      id: "acoustic-2",
      title: "Bosque e Cordas Calmas",
      style: "acoustic",
      styleLabel: "Violão Relaxante",
      artist: "Warm Strings",
      duration: 215,
    },
  ],
};

class SoundscapeManager {
  private ctx: AudioContext | null = null;
  private currentStyle: SoundscapeStyle = "lofi";
  private trackIndex: number = 0;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private volume: number = 0.55;

  private masterGain: GainNode | null = null;
  private noiseNode: AudioNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private musicInterval: number | null = null;
  private progressInterval: number | null = null;

  private listeners: Set<(state: SoundscapePlayerState) => void> = new Set();

  constructor() {
    this.initCatalog();
  }

  private initCatalog() {
    // start with first lofi track
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  getCurrentTrack(): SoundscapeTrack {
    const list = SOUNDSCAPE_CATALOG[this.currentStyle];
    return list[this.trackIndex % list.length];
  }

  getState(): SoundscapePlayerState {
    const track = this.getCurrentTrack();
    const list = SOUNDSCAPE_CATALOG[this.currentStyle];
    return {
      isPlaying: this.isPlaying,
      currentStyle: this.currentStyle,
      currentTrack: track,
      currentTime: this.currentTime,
      duration: track.duration,
      volume: this.volume,
      trackIndex: this.trackIndex + 1,
      totalTracks: list.length,
    };
  }

  subscribe(fn: (s: SoundscapePlayerState) => void): () => void {
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

  setStyle(style: SoundscapeStyle) {
    if (this.currentStyle === style) return;
    this.currentStyle = style;
    this.trackIndex = 0;
    this.currentTime = 0;
    if (this.isPlaying) {
      this.stopSynthesis();
      this.startSynthesis();
    }
    this.notify();
  }

  play() {
    this.initCtx();
    this.isPlaying = true;
    this.startSynthesis();
    this.startProgressTracker();
    this.notify();
  }

  pause() {
    this.isPlaying = false;
    this.stopSynthesis();
    if (this.progressInterval != null) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.notify();
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  nextTrack() {
    const list = SOUNDSCAPE_CATALOG[this.currentStyle];
    this.trackIndex = (this.trackIndex + 1) % list.length;
    this.currentTime = 0;
    if (this.isPlaying) {
      this.stopSynthesis();
      this.startSynthesis();
    }
    this.notify();
  }

  next() {
    this.nextTrack();
  }

  prevTrack() {
    const list = SOUNDSCAPE_CATALOG[this.currentStyle];
    this.trackIndex = (this.trackIndex - 1 + list.length) % list.length;
    this.currentTime = 0;
    if (this.isPlaying) {
      this.stopSynthesis();
      this.startSynthesis();
    }
    this.notify();
  }

  prev() {
    this.prevTrack();
  }

  onStateChange(fn: (s: SoundscapePlayerState) => void): () => void {
    return this.subscribe(fn);
  }

  seek(seconds: number) {
    const track = this.getCurrentTrack();
    this.currentTime = Math.max(0, Math.min(track.duration, seconds));
    this.notify();
  }

  private startProgressTracker() {
    if (this.progressInterval != null) clearInterval(this.progressInterval);
    this.progressInterval = window.setInterval(() => {
      if (!this.isPlaying) return;
      const track = this.getCurrentTrack();
      this.currentTime++;
      if (this.currentTime >= track.duration) {
        this.nextTrack();
      } else {
        this.notify();
      }
    }, 1000);
  }

  private stopSynthesis() {
    if (this.musicInterval != null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
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

  private startSynthesis() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    switch (this.currentStyle) {
      case "lofi":
        this.synthLoFi();
        break;
      case "piano":
        this.synthPiano();
        break;
      case "rain":
        this.synthRain();
        break;
      case "ambient":
        this.synthAmbient();
        break;
      case "ocean":
        this.synthOcean();
        break;
      case "acoustic":
        this.synthAcoustic();
        break;
    }
  }

  // ── Generative Audio Engines ──────────────────────────────────────────────

  private makeBrownNoise(targetFilterHz: number = 400) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5;
    }

    const brownNoise = this.ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(targetFilterHz, this.ctx.currentTime);

    brownNoise.connect(filter);
    filter.connect(this.masterGain);
    brownNoise.start();

    this.noiseNode = brownNoise;
    this.filterNode = filter;
  }

  private synthLoFi() {
    this.makeBrownNoise(350);

    // Warm Lo-Fi jazz chord progressions
    const progressions = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];

    let chordIdx = 0;
    const playChord = () => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;
      const currentChord = progressions[chordIdx % progressions.length];
      chordIdx++;

      const now = this.ctx.currentTime;
      for (const freq of currentChord) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filt = this.ctx.createBiquadFilter();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        filt.type = "lowpass";
        filt.frequency.setValueAtTime(600, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.038, now + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc.connect(filt);
        filt.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 4.0);
      }
    };

    playChord();
    this.musicInterval = window.setInterval(playChord, 4000);
  }

  private synthPiano() {
    // Beautiful minimalist acoustic piano chords
    const pianoChords = [
      [130.81, 196.0, 261.63, 311.13, 392.0], // Cm9
      [116.54, 174.61, 233.08, 277.18, 349.23], // Bb
      [103.83, 155.56, 207.65, 261.63, 311.13], // Abmaj7
      [123.47, 185.0, 246.94, 293.66, 369.99],  // B
    ];

    let chordIdx = 0;
    const playPiano = () => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;
      const chord = pianoChords[chordIdx % pianoChords.length];
      chordIdx++;

      const now = this.ctx.currentTime;
      chord.forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1400, now);

        gain.gain.setValueAtTime(0.0001, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.045, now + i * 0.12 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 4.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 4.8);
      });
    };

    playPiano();
    this.musicInterval = window.setInterval(playPiano, 5000);
  }

  private synthRain() {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
      b6 = white * 0.115926;
    }

    const rain = this.ctx.createBufferSource();
    rain.buffer = noiseBuffer;
    rain.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(950, this.ctx.currentTime);

    rain.connect(filter);
    filter.connect(this.masterGain);
    rain.start();

    this.noiseNode = rain;
    this.filterNode = filter;
  }

  private synthAmbient() {
    if (!this.ctx || !this.masterGain) return;
    this.makeBrownNoise(280);

    // Ethereal drone frequencies (F# minor chord: F#2, C#3, A3, E4)
    const freqs = [92.5, 138.59, 220.0, 329.63];
    const now = this.ctx.currentTime;
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, now);
      filter.Q.setValueAtTime(3, now);

      gain.gain.setValueAtTime(0.015, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
    }
  }

  private synthOcean() {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.28;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // 10s ocean swells

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(220, this.ctx.currentTime);

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

  private synthAcoustic() {
    // Warm nylon string resonance
    const acousticPitches = [
      [164.81, 246.94, 329.63], // E minor
      [174.61, 261.63, 349.23], // F major
      [196.0, 293.66, 392.0],   // G major
      [220.0, 329.63, 440.0],   // A minor
    ];

    let step = 0;
    const playAcoustic = () => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;
      const triad = acousticPitches[step % acousticPitches.length];
      step++;

      const now = this.ctx.currentTime;
      triad.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(750, now);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.03, now + idx * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 3.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 3.4);
      });
    };

    playAcoustic();
    this.musicInterval = window.setInterval(playAcoustic, 4200);
  }

  formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
}

export const Soundscape = new SoundscapeManager();
