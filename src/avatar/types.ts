/**
 * Tipos e interfaces do Avatar Interativo Embasa.
 */

export type Emotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'surprised'
  | 'worried'
  | 'sad'
  | 'celebrating'
  | 'error';

export type Gesture =
  | 'idle'
  | 'wave'
  | 'thumbs-up'
  | 'pointing'
  | 'celebrating'
  | 'thinking';

export type MouthState =
  | 'neutral'
  | 'smile'
  | 'open'
  | 'surprised'
  | 'talking'
  | 'worried';

export type EyeState =
  | 'normal'
  | 'blink'
  | 'looking-left'
  | 'looking-right'
  | 'looking-up'
  | 'looking-down'
  | 'surprised'
  | 'happy'
  | 'worried';

export interface GazeCoords {
  x: number; // -1 (esquerda) a +1 (direita)
  y: number; // -1 (cima) a +1 (baixo)
}

export interface AvatarState {
  emotion: Emotion;
  gesture: Gesture;
  mouth: MouthState;
  eyeState: EyeState;
  isSpeaking: boolean;
  isBlinking: boolean;
  gaze: GazeCoords;
  headTilt: number; // graus
}

export interface AvatarAPI {
  /** Altera a emoção atual do avatar */
  setEmotion(emotion: Emotion): void;
  /** Executa um gesto específico (com duração opcional em ms para voltar a idle) */
  playGesture(gesture: Gesture, durationMs?: number): void;
  /** Inicia animação de fala contínua */
  startSpeaking(): void;
  /** Para a animação de fala */
  stopSpeaking(): void;
  /** Direciona o olhar do avatar (valores normalizados de -1 a 1) */
  setGaze(x: number, y: number): void;
  /** Força uma piscada de olhos */
  blink(): void;
  /** Retorna o estado atual completo da máquina de estados */
  getState(): AvatarState;
}

export interface AvatarProps {
  /** Emoção inicial ou controlada */
  emotion?: Emotion;
  /** Gesto inicial ou controlado */
  gesture?: Gesture;
  /** Se o avatar está falando */
  isSpeaking?: boolean;
  /** Coordenadas do olhar (-1 a 1) */
  gaze?: GazeCoords;
  /** Se deve piscar automaticamente em intervalos naturais (padrão: true) */
  enableBlinking?: boolean;
  /** Se deve ter animação de respiração contínua (padrão: true) */
  enableBreathing?: boolean;
  /** Se deve ter movimento de flutuação idle (padrão: true) */
  enableIdleMovement?: boolean;
  /** Se deve seguir o cursor do mouse na tela (padrão: false) */
  enableCursorTracking?: boolean;
  /** Largura/altura do avatar em pixels ou string CSS (padrão: 320) */
  size?: number | string;
  /** Classe CSS customizada */
  className?: string;
  /** Estilos inline customizados */
  style?: Record<string, string | number>;
  /** Callback quando a emoção muda */
  onEmotionChange?: (emotion: Emotion) => void;
  /** Callback quando um gesto termina e volta a idle */
  onGestureEnd?: (gesture: Gesture) => void;
}
