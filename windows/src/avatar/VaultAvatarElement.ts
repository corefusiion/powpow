import {
  VAULT_RIG_SVG,
  VAULT_PIVOTS,
  VAULT_POSE_PRESETS,
  type BoneKey,
} from './VaultRigData';
import type {
  AvatarAPI,
  AvatarState,
  Emotion,
  Gesture,
  MouthState,
} from './types';

export type MouthVariant = 'normal' | 'happy' | 'surprised' | 'thinking' | 'sad' | 'talking';
export type HandRightVariant = 'thumbs-up' | 'wave' | 'fist' | 'pointing' | 'open';
export type HandLeftVariant = 'hip' | 'open' | 'fist' | 'pointing';

/**
 * Web Component <vault-avatar>
 * Implementa Rig 2D Articulado com controle direto por ossos e conformidade com AvatarAPI.
 *
 * Características:
 * - 17 articulações independentes com rotação precisa em torno de pivôs anatômicos.
 * - Juntas com coberturas circulares de sobreposição (overlap caps) sem furos ou costuras visíveis.
 * - Olhos independentes com clipPath e rastreamento contínuo de olhar.
 * - 6 formatos de boca expressivos baseados na model sheet oficial.
 * - Mãos intercambiáveis (Thumbs-Up icônico, Wave, Pointing, Fist, Hip-Rest, Open).
 * - Overlay de esqueleto visual para inspeção e depuração das juntas.
 */
export class VaultAvatarElement extends HTMLElement implements AvatarAPI {
  private svgEl: SVGSVGElement;
  private boneAngles: Map<BoneKey, number> = new Map();
  private boneElements: Map<BoneKey, SVGGElement> = new Map();
  private skeletonOverlayGroup?: SVGGElement;

  private currentEmotion: Emotion = 'neutral';
  private currentGesture: Gesture = 'idle';
  private currentMouth: MouthVariant = 'normal';
  private currentHandRight: HandRightVariant = 'thumbs-up';
  private currentHandLeft: HandLeftVariant = 'hip';

  private gazeX: number = 0;
  private gazeY: number = 0;
  private isBlinking: boolean = false;
  private isSpeaking: boolean = false;
  private showSkeleton: boolean = false;

  private blinkTimeout?: number;
  private autoBlinkInterval?: number;
  private speakInterval?: number;
  private gestureTimeout?: number;
  private mouseHandler?: (e: MouseEvent) => void;

  constructor() {
    super();

    this.style.display = 'inline-block';
    this.style.width = '100%';
    this.style.height = '100%';
    this.style.userSelect = 'none';

    this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgEl.setAttribute('viewBox', '0 0 400 520');
    this.svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svgEl.style.width = '100%';
    this.svgEl.style.height = '100%';
    this.svgEl.style.overflow = 'visible';

    this.svgEl.innerHTML = VAULT_RIG_SVG;
    this.appendChild(this.svgEl);

    this.cacheBoneElements();
    this.applyPose('reference');
  }

  connectedCallback() {
    this.startAutoBlinking(true);
    if (this.hasAttribute('tracking')) {
      this.enableCursorTracking(true);
    }
  }

  disconnectedCallback() {
    this.startAutoBlinking(false);
    this.stopSpeaking();
    this.enableCursorTracking(false);
    if (this.gestureTimeout) window.clearTimeout(this.gestureTimeout);
  }

  private cacheBoneElements() {
    const bones: { key: BoneKey; id: string }[] = [
      { key: 'root', id: 'vault-root' },
      { key: 'pelvis', id: 'bone-pelvis' },
      { key: 'torso', id: 'bone-torso' },
      { key: 'neck', id: 'bone-neck' },
      { key: 'head', id: 'bone-head' },
      { key: 'shoulder_right', id: 'bone-shoulder-right' },
      { key: 'elbow_right', id: 'bone-elbow-right' },
      { key: 'wrist_right', id: 'bone-wrist-right' },
      { key: 'shoulder_left', id: 'bone-shoulder-left' },
      { key: 'elbow_left', id: 'bone-elbow-left' },
      { key: 'wrist_left', id: 'bone-wrist-left' },
      { key: 'hip_right', id: 'bone-hip-right' },
      { key: 'knee_right', id: 'bone-knee-right' },
      { key: 'ankle_right', id: 'bone-ankle-right' },
      { key: 'hip_left', id: 'bone-hip-left' },
      { key: 'knee_left', id: 'bone-knee-left' },
      { key: 'ankle_left', id: 'bone-ankle-left' },
    ];

    for (const { key, id } of bones) {
      const el = this.svgEl.querySelector<SVGGElement>(`#${id}`);
      if (el) {
        this.boneElements.set(key, el);
      }
    }
  }

  // ── Controle Articulado de Ossos (Direct Bone Kinematics) ──

  /**
   * Define o ângulo de rotação em graus para uma junta/osso específico
   */
  public setBoneAngle(bone: BoneKey, angleDeg: number): void {
    const pivot = VAULT_PIVOTS[bone];
    if (!pivot) return;

    // Limita o ângulo de acordo com as restrições anatômicas
    const clamped = Math.max(pivot.minAngle, Math.min(pivot.maxAngle, angleDeg));
    this.boneAngles.set(bone, clamped);

    const el = this.boneElements.get(bone);
    if (el) {
      el.style.transformOrigin = `${pivot.x}px ${pivot.y}px`;
      el.style.transform = `rotate(${clamped}deg)`;
      el.style.transition = 'transform 0.12s ease-out';
    }

    if (this.showSkeleton) {
      this.renderSkeletonOverlay();
    }
  }

  /**
   * Obtém o ângulo atual de uma junta em graus
   */
  public getBoneAngle(bone: BoneKey): number {
    return this.boneAngles.get(bone) ?? VAULT_PIVOTS[bone]?.defaultAngle ?? 0;
  }

  /**
   * Aplica um preset de pose (reference, walk_stride, waving, pointing, thinking, celebrating, crossed)
   */
  public applyPose(presetName: string): void {
    const preset = VAULT_POSE_PRESETS[presetName] || VAULT_POSE_PRESETS.reference;

    // Aplica cada rotação de osso
    for (const [key, angle] of Object.entries(preset)) {
      if (typeof angle === 'number') {
        this.setBoneAngle(key as BoneKey, angle);
      }
    }

    // Ajusta as variantes das mãos condizentes com a pose
    if (presetName === 'waving') {
      this.setHandVariant('right', 'wave');
      this.setHandVariant('left', 'hip');
    } else if (presetName === 'pointing') {
      this.setHandVariant('right', 'pointing');
      this.setHandVariant('left', 'hip');
    } else if (presetName === 'celebrating') {
      this.setHandVariant('right', 'fist');
      this.setHandVariant('left', 'fist');
    } else if (presetName === 'walk_stride') {
      this.setHandVariant('right', 'open');
      this.setHandVariant('left', 'open');
    } else {
      this.setHandVariant('right', 'thumbs-up');
      this.setHandVariant('left', 'hip');
    }
  }

  // ── Expressões Faciais & Bocas ──

  public setMouthVariant(variant: MouthVariant): void {
    this.currentMouth = variant;
    const variants: MouthVariant[] = ['normal', 'happy', 'surprised', 'thinking', 'sad', 'talking'];
    for (const v of variants) {
      const el = this.svgEl.querySelector<SVGElement>(`#vault-mouth-${v}`);
      if (el) {
        el.style.display = v === variant ? 'inline' : 'none';
      }
    }
  }

  public setHandVariant(side: 'left' | 'right', variant: string): void {
    if (side === 'right') {
      this.currentHandRight = variant as HandRightVariant;
      const variants: HandRightVariant[] = ['thumbs-up', 'wave', 'fist', 'pointing', 'open'];
      for (const v of variants) {
        const el = this.svgEl.querySelector<SVGElement>(`#vault-hand-right-${v}`);
        if (el) {
          el.style.display = v === variant ? 'inline' : 'none';
        }
      }
    } else {
      this.currentHandLeft = variant as HandLeftVariant;
      const variants: HandLeftVariant[] = ['hip', 'open', 'fist', 'pointing'];
      for (const v of variants) {
        const el = this.svgEl.querySelector<SVGElement>(`#vault-hand-left-${v}`);
        if (el) {
          el.style.display = v === variant ? 'inline' : 'none';
        }
      }
    }
  }

  public getHandVariant(side: 'left' | 'right'): string {
    return side === 'right' ? this.currentHandRight : this.currentHandLeft;
  }

  public getMouthVariant(): MouthVariant {
    return this.currentMouth;
  }

  // ── Overlay de Inspeção de Esqueleto & Pivôs ──

  public toggleSkeletonOverlay(show?: boolean): void {
    this.showSkeleton = show !== undefined ? show : !this.showSkeleton;
    if (!this.skeletonOverlayGroup) {
      this.skeletonOverlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.skeletonOverlayGroup.setAttribute('id', 'vault-skeleton-overlay');
      this.skeletonOverlayGroup.style.pointerEvents = 'none';
      this.svgEl.appendChild(this.skeletonOverlayGroup);
    }

    this.skeletonOverlayGroup.style.display = this.showSkeleton ? 'inline' : 'none';
    if (this.showSkeleton) {
      this.renderSkeletonOverlay();
    }
  }

  private renderSkeletonOverlay(): void {
    if (!this.skeletonOverlayGroup) return;

    let html = `
      <!-- Wireframe de Pivôs e Conexões Articuladas -->
      <g stroke="#00FFCC" stroke-width="2" stroke-dasharray="4,3" opacity="0.85">
        <!-- Coluna & Cabeça -->
        <line x1="200" y1="310" x2="200" y2="195" />
        <line x1="200" y1="195" x2="200" y2="185" />
        <!-- Braço Direito -->
        <line x1="200" y1="220" x2="150" y2="220" />
        <line x1="150" y1="220" x2="115" y2="220" />
        <line x1="115" y1="220" x2="85" y2="175" />
        <!-- Braço Esquerdo -->
        <line x1="200" y1="220" x2="245" y2="220" />
        <line x1="245" y1="220" x2="285" y2="255" />
        <line x1="285" y1="255" x2="295" y2="305" />
        <!-- Perna Direita -->
        <line x1="200" y1="310" x2="175" y2="325" />
        <line x1="175" y1="325" x2="165" y2="410" />
        <line x1="165" y1="410" x2="155" y2="475" />
        <!-- Perna Esquerda -->
        <line x1="200" y1="310" x2="225" y2="325" />
        <line x1="225" y1="325" x2="235" y2="410" />
        <line x1="235" y1="410" x2="245" y2="475" />
      </g>
    `;

    // Desenha cada ponto de articulação com círculo neon
    for (const [key, pivot] of Object.entries(VAULT_PIVOTS)) {
      html += `
        <g class="pivot-indicator" transform="translate(${pivot.x}, ${pivot.y})">
          <circle cx="0" cy="0" r="5" fill="#FF0055" stroke="#FFFFFF" stroke-width="1.5" />
          <text x="7" y="3" fill="#FFFFFF" font-size="8" font-family="monospace" font-weight="bold">${key}</text>
        </g>
      `;
    }

    this.skeletonOverlayGroup.innerHTML = html;
  }

  // ── Implementação da AvatarAPI ──

  public setEmotion(emotion: Emotion): void {
    this.currentEmotion = emotion;

    const eyebrowR = this.svgEl.querySelector<SVGElement>('#vault-eyebrow-right');
    const eyebrowL = this.svgEl.querySelector<SVGElement>('#vault-eyebrow-left');

    if (emotion === 'happy' || emotion === 'excited') {
      this.setMouthVariant('happy');
      if (eyebrowR) eyebrowR.style.transform = 'translateY(-3px) rotate(4deg)';
      if (eyebrowL) eyebrowL.style.transform = 'translateY(-3px) rotate(-4deg)';
    } else if (emotion === 'surprised') {
      this.setMouthVariant('surprised');
      if (eyebrowR) eyebrowR.style.transform = 'translateY(-6px) rotate(-8deg)';
      if (eyebrowL) eyebrowL.style.transform = 'translateY(-6px) rotate(8deg)';
    } else if (emotion === 'thinking') {
      this.setMouthVariant('thinking');
      if (eyebrowR) eyebrowR.style.transform = 'translateY(-4px) rotate(10deg)';
      if (eyebrowL) eyebrowL.style.transform = 'translateY(1px) rotate(-5deg)';
    } else if (emotion === 'sad' || emotion === 'worried') {
      this.setMouthVariant('sad');
      if (eyebrowR) eyebrowR.style.transform = 'translateY(2px) rotate(-12deg)';
      if (eyebrowL) eyebrowL.style.transform = 'translateY(2px) rotate(12deg)';
    } else {
      this.setMouthVariant('normal');
      if (eyebrowR) eyebrowR.style.transform = 'none';
      if (eyebrowL) eyebrowL.style.transform = 'none';
    }
  }

  public playGesture(gesture: Gesture, durationMs: number = 2400): void {
    this.currentGesture = gesture;

    if (gesture === 'wave') {
      this.applyPose('waving');
    } else if (gesture === 'thumbs-up') {
      this.applyPose('reference');
    } else if (gesture === 'pointing') {
      this.applyPose('pointing');
    } else if (gesture === 'celebrating') {
      this.applyPose('celebrating');
    } else if (gesture === 'thinking') {
      this.applyPose('thinking');
    }

    if (this.gestureTimeout) window.clearTimeout(this.gestureTimeout);
    if (durationMs > 0 && gesture !== 'idle') {
      this.gestureTimeout = window.setTimeout(() => {
        this.currentGesture = 'idle';
        this.applyPose('reference');
      }, durationMs);
    }
  }

  public startSpeaking(): void {
    if (this.isSpeaking) return;
    this.isSpeaking = true;
    let step = 0;
    this.speakInterval = window.setInterval(() => {
      step++;
      this.setMouthVariant(step % 2 === 0 ? 'talking' : 'normal');
    }, 180);
  }

  public stopSpeaking(): void {
    this.isSpeaking = false;
    if (this.speakInterval) {
      window.clearInterval(this.speakInterval);
      this.speakInterval = undefined;
    }
    this.setMouthVariant('normal');
  }

  public setGaze(x: number, y: number): void {
    this.gazeX = Math.max(-1, Math.min(1, x));
    this.gazeY = Math.max(-1, Math.min(1, y));

    const maxOffset = 3.5;
    const dx = this.gazeX * maxOffset;
    const dy = this.gazeY * (maxOffset * 0.7);

    const pupilR = this.svgEl.querySelector<SVGElement>('#vault-pupil-right');
    const pupilL = this.svgEl.querySelector<SVGElement>('#vault-pupil-left');

    if (pupilR) pupilR.style.transform = `translate(${dx}px, ${dy}px)`;
    if (pupilL) pupilL.style.transform = `translate(${dx}px, ${dy}px)`;

    // Sutil inclinação da cabeça acompanhando o olhar
    const headTilt = this.gazeX * 5;
    this.setBoneAngle('head', headTilt);
  }

  public blink(): void {
    if (this.isBlinking) return;
    this.isBlinking = true;

    const lidR = this.svgEl.querySelector<SVGElement>('#vault-eyelid-right');
    const lidL = this.svgEl.querySelector<SVGElement>('#vault-eyelid-left');
    const eyeR = this.svgEl.querySelector<SVGElement>('#vault-eye-right-group ellipse');
    const eyeL = this.svgEl.querySelector<SVGElement>('#vault-eye-left-group ellipse');
    const pupilR = this.svgEl.querySelector<SVGElement>('#vault-pupil-right');
    const pupilL = this.svgEl.querySelector<SVGElement>('#vault-pupil-left');

    if (lidR) lidR.style.display = 'inline';
    if (lidL) lidL.style.display = 'inline';
    if (pupilR) pupilR.style.display = 'none';
    if (pupilL) pupilL.style.display = 'none';
    if (eyeR) eyeR.style.display = 'none';
    if (eyeL) eyeL.style.display = 'none';

    window.setTimeout(() => {
      if (lidR) lidR.style.display = 'none';
      if (lidL) lidL.style.display = 'none';
      if (pupilR) pupilR.style.display = 'inline';
      if (pupilL) pupilL.style.display = 'inline';
      if (eyeR) eyeR.style.display = 'inline';
      if (eyeL) eyeL.style.display = 'inline';
      this.isBlinking = false;
    }, 130);
  }

  public startAutoBlinking(enable: boolean): void {
    if (this.autoBlinkInterval) {
      window.clearInterval(this.autoBlinkInterval);
      this.autoBlinkInterval = undefined;
    }
    if (enable) {
      const scheduleNext = () => {
        const ms = 2200 + Math.random() * 3400;
        this.blinkTimeout = window.setTimeout(() => {
          this.blink();
          scheduleNext();
        }, ms);
      };
      scheduleNext();
    } else {
      if (this.blinkTimeout) window.clearTimeout(this.blinkTimeout);
    }
  }

  public enableCursorTracking(enable: boolean): void {
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
        this.setGaze(nx, ny);
      };
      window.addEventListener('mousemove', this.mouseHandler);
    }
  }

  public getState(): AvatarState {
    return {
      emotion: this.currentEmotion,
      gesture: this.currentGesture,
      mouth: this.currentMouth as MouthState,
      eyeState: this.isBlinking ? 'blink' : 'normal',
      isSpeaking: this.isSpeaking,
      isBlinking: this.isBlinking,
      gaze: { x: this.gazeX, y: this.gazeY },
      headTilt: this.getBoneAngle('head'),
    };
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('vault-avatar')) {
  customElements.define('vault-avatar', VaultAvatarElement);
}
