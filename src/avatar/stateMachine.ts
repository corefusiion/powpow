import {
  AvatarState,
  Emotion,
  EyeState,
  GazeCoords,
  Gesture,
  MouthState,
} from './types';

export interface EmotionProfile {
  mouth: MouthState;
  eyeState: EyeState;
  headTilt: number; // graus
  eyebrowOffset: { left: { y: number; rotate: number }; right: { y: number; rotate: number } };
  suggestedGesture?: Gesture;
}

export const EMOTION_PROFILES: Record<Emotion, EmotionProfile> = {
  neutral: {
    mouth: 'neutral',
    eyeState: 'normal',
    headTilt: 0,
    eyebrowOffset: {
      left: { y: 0, rotate: 0 },
      right: { y: 0, rotate: 0 },
    },
  },
  happy: {
    mouth: 'smile',
    eyeState: 'happy',
    headTilt: 3,
    eyebrowOffset: {
      left: { y: -4, rotate: 3 },
      right: { y: -4, rotate: -3 },
    },
  },
  excited: {
    mouth: 'open',
    eyeState: 'surprised',
    headTilt: -4,
    eyebrowOffset: {
      left: { y: -8, rotate: 6 },
      right: { y: -8, rotate: -6 },
    },
    suggestedGesture: 'celebrating',
  },
  thinking: {
    mouth: 'worried',
    eyeState: 'looking-up',
    headTilt: -7,
    eyebrowOffset: {
      left: { y: -10, rotate: 8 },
      right: { y: 2, rotate: -4 },
    },
    suggestedGesture: 'thinking',
  },
  surprised: {
    mouth: 'surprised',
    eyeState: 'surprised',
    headTilt: 0,
    eyebrowOffset: {
      left: { y: -12, rotate: 2 },
      right: { y: -12, rotate: -2 },
    },
  },
  worried: {
    mouth: 'worried',
    eyeState: 'worried',
    headTilt: 4,
    eyebrowOffset: {
      left: { y: -2, rotate: -8 },
      right: { y: -2, rotate: 8 },
    },
  },
  sad: {
    mouth: 'neutral',
    eyeState: 'worried',
    headTilt: 6,
    eyebrowOffset: {
      left: { y: 3, rotate: -10 },
      right: { y: 3, rotate: 10 },
    },
  },
  celebrating: {
    mouth: 'open',
    eyeState: 'happy',
    headTilt: -3,
    eyebrowOffset: {
      left: { y: -7, rotate: 5 },
      right: { y: -7, rotate: -5 },
    },
    suggestedGesture: 'celebrating',
  },
  error: {
    mouth: 'worried',
    eyeState: 'worried',
    headTilt: -5,
    eyebrowOffset: {
      left: { y: 4, rotate: -12 },
      right: { y: 4, rotate: 12 },
    },
  },
};

export class AvatarStateMachine {
  private state: AvatarState;
  private listeners: Set<(state: AvatarState) => void> = new Set();
  private gestureTimer: number | null = null;
  private blinkTimer: number | null = null;
  private blinkDurationTimer: number | null = null;
  private talkInterval: number | null = null;
  private talkFrame = 0;
  private enableBlinking = true;

  constructor(initialEmotion: Emotion = 'neutral', initialGesture: Gesture = 'idle') {
    const profile = EMOTION_PROFILES[initialEmotion] ?? EMOTION_PROFILES.neutral;
    this.state = {
      emotion: initialEmotion,
      gesture: initialGesture,
      mouth: profile.mouth,
      eyeState: profile.eyeState,
      isSpeaking: false,
      isBlinking: false,
      gaze: { x: 0, y: 0 },
      headTilt: profile.headTilt,
    };
  }

  public subscribe(fn: (state: AvatarState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  public setEmotion(emotion: Emotion) {
    if (this.state.emotion === emotion) return;
    const profile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.neutral;

    this.state = {
      ...this.state,
      emotion,
      mouth: this.state.isSpeaking ? 'talking' : profile.mouth,
      eyeState: this.state.isBlinking ? 'blink' : profile.eyeState,
      headTilt: profile.headTilt,
    };

    if (profile.suggestedGesture && this.state.gesture === 'idle') {
      this.playGesture(profile.suggestedGesture, 2500);
    } else {
      this.notify();
    }
  }

  public playGesture(gesture: Gesture, durationMs: number = 2400) {
    if (this.gestureTimer !== null) {
      clearTimeout(this.gestureTimer);
      this.gestureTimer = null;
    }

    this.state = { ...this.state, gesture };
    this.notify();

    if (gesture !== 'idle' && durationMs > 0) {
      this.gestureTimer = window.setTimeout(() => {
        this.state = { ...this.state, gesture: 'idle' };
        this.gestureTimer = null;
        this.notify();
      }, durationMs);
    }
  }

  public startSpeaking() {
    if (this.state.isSpeaking) return;
    this.state = { ...this.state, isSpeaking: true, mouth: 'talking' };
    this.notify();

    // Lip sync ciclo
    if (this.talkInterval !== null) clearInterval(this.talkInterval);
    const talkSequence: MouthState[] = ['open', 'talking', 'smile', 'open', 'talking', 'neutral'];
    this.talkInterval = window.setInterval(() => {
      this.talkFrame = (this.talkFrame + 1) % talkSequence.length;
      if (this.state.isSpeaking) {
        this.state = { ...this.state, mouth: talkSequence[this.talkFrame] };
        this.notify();
      }
    }, 140);
  }

  public stopSpeaking() {
    if (!this.state.isSpeaking) return;
    if (this.talkInterval !== null) {
      clearInterval(this.talkInterval);
      this.talkInterval = null;
    }
    const profile = EMOTION_PROFILES[this.state.emotion] || EMOTION_PROFILES.neutral;
    this.state = { ...this.state, isSpeaking: false, mouth: profile.mouth };
    this.notify();
  }

  public setGaze(x: number, y: number) {
    const clampedX = Math.max(-1, Math.min(1, x));
    const clampedY = Math.max(-1, Math.min(1, y));
    this.state = { ...this.state, gaze: { x: clampedX, y: clampedY } };
    this.notify();
  }

  public blink() {
    if (this.state.isBlinking) return;
    const prevEye = this.state.eyeState;
    this.state = { ...this.state, isBlinking: true, eyeState: 'blink' };
    this.notify();

    if (this.blinkDurationTimer !== null) clearTimeout(this.blinkDurationTimer);
    this.blinkDurationTimer = window.setTimeout(() => {
      const profile = EMOTION_PROFILES[this.state.emotion] || EMOTION_PROFILES.neutral;
      this.state = { ...this.state, isBlinking: false, eyeState: profile.eyeState };
      this.blinkDurationTimer = null;
      this.notify();
    }, 160);
  }

  public startAutoBlinking(enabled: boolean = true) {
    this.enableBlinking = enabled;
    if (!enabled) {
      if (this.blinkTimer !== null) {
        clearTimeout(this.blinkTimer);
        this.blinkTimer = null;
      }
      return;
    }

    const scheduleNextBlink = () => {
      const delay = 2200 + Math.random() * 3200; // 2.2s a 5.4s
      this.blinkTimer = window.setTimeout(() => {
        if (this.enableBlinking && !this.state.isBlinking) {
          this.blink();
        }
        scheduleNextBlink();
      }, delay);
    };

    scheduleNextBlink();
  }

  public stopAutoBlinking() {
    this.enableBlinking = false;
    if (this.blinkTimer !== null) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
  }

  public destroy() {
    if (this.gestureTimer !== null) clearTimeout(this.gestureTimer);
    if (this.blinkTimer !== null) clearTimeout(this.blinkTimer);
    if (this.blinkDurationTimer !== null) clearTimeout(this.blinkDurationTimer);
    if (this.talkInterval !== null) clearInterval(this.talkInterval);
    this.listeners.clear();
  }

  public getState(): AvatarState {
    return this.state;
  }
}
