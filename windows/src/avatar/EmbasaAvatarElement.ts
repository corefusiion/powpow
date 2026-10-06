import { EMBASA_DEFS, EMBASA_INNER_SVG } from './EmbasaAvatarData';
import { AvatarStateMachine, EMOTION_PROFILES } from './stateMachine';
import type {
  AvatarAPI,
  AvatarState,
  Emotion,
  Gesture,
} from './types';
import './styles.css';

/**
 * Avatar Interativo Embasa em Web Component / Elemento Nativo DOM.
 * Pode ser instanciado via new EmbasaAvatarElement() ou <embasa-avatar>.
 * Implementa 100% da interface AvatarAPI solicitada:
 * - 18 IDs semânticos acessíveis diretamente
 * - Ordem nativa dos layers estritamente preservada (sem distorção 3D)
 * - Rastreamento dos olhos e cursor do mouse
 * - Blinking automático, breathing e floating idle
 * - Lip sync ao falar
 */
export class EmbasaAvatarElement extends HTMLElement implements AvatarAPI {
  private sm: AvatarStateMachine;
  private containerEl: HTMLDivElement;
  private svgEl: SVGSVGElement;
  private unsub?: () => void;
  private mouseHandler?: (e: MouseEvent) => void;

  constructor() {
    super();
    this.sm = new AvatarStateMachine('neutral', 'idle');

    this.containerEl = document.createElement('div');
    this.containerEl.className = 'embasa-avatar-container is-breathing is-idle-moving';
    this.containerEl.style.width = '100%';
    this.containerEl.style.height = '100%';

    this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgEl.setAttribute('class', 'embasa-avatar-svg');
    this.svgEl.setAttribute('viewBox', '0 0 1024 1024');
    this.svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svgEl.style.overflow = 'visible';

    this.svgEl.innerHTML = `
      <defs>
        ${EMBASA_DEFS}
      </defs>
      ${EMBASA_INNER_SVG}
    `;

    this.containerEl.appendChild(this.svgEl);
  }

  connectedCallback() {
    if (!this.contains(this.containerEl)) {
      this.appendChild(this.containerEl);
    }

    this.unsub = this.sm.subscribe((state) => {
      this.renderState(state);
    });

    this.sm.startAutoBlinking(true);

    if (this.hasAttribute('tracking')) {
      this.enableCursorTracking(true);
    }
  }

  disconnectedCallback() {
    this.unsub?.();
    this.sm.destroy();
    this.enableCursorTracking(false);
  }

  private renderState(st: AvatarState) {
    const profile = EMOTION_PROFILES[st.emotion] || EMOTION_PROFILES.neutral;

    this.containerEl.className = [
      'embasa-avatar-container',
      `emotion-${st.emotion}`,
      `gesture-${st.gesture}`,
      `mouth-${st.mouth}`,
      `eye-${st.eyeState}`,
      st.isSpeaking ? 'is-speaking' : '',
      st.isBlinking ? 'is-blinking' : '',
      'is-breathing',
      'is-idle-moving',
    ]
      .filter(Boolean)
      .join(' ');

    this.containerEl.style.setProperty('--head-tilt', `${st.headTilt}deg`);
    this.containerEl.style.setProperty('--gaze-x', `${st.gaze.x}`);
    this.containerEl.style.setProperty('--gaze-y', `${st.gaze.y}`);
    this.containerEl.style.setProperty('--eb-l-y', `${profile.eyebrowOffset.left.y}px`);
    this.containerEl.style.setProperty('--eb-l-rot', `${profile.eyebrowOffset.left.rotate}deg`);
    this.containerEl.style.setProperty('--eb-r-y', `${profile.eyebrowOffset.right.y}px`);
    this.containerEl.style.setProperty('--eb-r-rot', `${profile.eyebrowOffset.right.rotate}deg`);
  }

  public enableCursorTracking(enable: boolean) {
    if (this.mouseHandler) {
      window.removeEventListener('mousemove', this.mouseHandler);
      this.mouseHandler = undefined;
    }
    if (enable) {
      this.mouseHandler = (e: MouseEvent) => {
        const rect = this.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
        this.sm.setGaze(nx, ny);
      };
      window.addEventListener('mousemove', this.mouseHandler);
    }
  }

  // ── Implementação da AvatarAPI ──

  public setEmotion(emotion: Emotion): void {
    this.sm.setEmotion(emotion);
  }

  public playGesture(gesture: Gesture, durationMs: number = 2400): void {
    this.sm.playGesture(gesture, durationMs);
  }

  public startSpeaking(): void {
    this.sm.startSpeaking();
  }

  public stopSpeaking(): void {
    this.sm.stopSpeaking();
  }

  public setGaze(x: number, y: number): void {
    this.sm.setGaze(x, y);
  }

  public blink(): void {
    this.sm.blink();
  }

  public getSemanticElement(id: string): SVGElement | null {
    return this.svgEl.querySelector(`#${id}`);
  }

  public getState(): AvatarState {
    return this.sm.getState();
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('embasa-avatar')) {
  customElements.define('embasa-avatar', EmbasaAvatarElement);
}
