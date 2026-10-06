import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { EMBASA_GRADIENTS, EMBASA_PARTS } from './EmbasaAvatarData';
import { AvatarStateMachine, EMOTION_PROFILES } from './stateMachine';
import './styles.css';
import {
  AvatarAPI,
  AvatarProps,
  AvatarState,
  Emotion,
  GazeCoords,
  Gesture,
} from './types';

function renderPaths(partName: string) {
  const list = EMBASA_PARTS[partName] || [];
  return list.map((p, idx) => (
    <path
      key={`${partName}-${idx}`}
      d={p.d}
      fill={p.fill || undefined}
      fillOpacity={p.fillOpacity || undefined}
    />
  ));
}

export const EmbasaAvatar = forwardRef<AvatarAPI, AvatarProps>((props, ref) => {
  const {
    emotion = 'neutral',
    gesture = 'idle',
    isSpeaking = false,
    gaze = { x: 0, y: 0 },
    enableBlinking = true,
    enableBreathing = true,
    enableIdleMovement = true,
    enableCursorTracking = false,
    size = 320,
    className = '',
    style = {},
    onEmotionChange,
    onGestureEnd,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const smRef = useRef<AvatarStateMachine | null>(null);

  if (!smRef.current) {
    smRef.current = new AvatarStateMachine(emotion, gesture);
  }
  const sm = smRef.current;

  const [state, setState] = useState<AvatarState>(() => sm.getState());

  useEffect(() => {
    const unsub = sm.subscribe((newState) => {
      setState(newState);
    });
    return () => unsub();
  }, [sm]);

  // Sincroniza props declarativas
  useEffect(() => {
    if (emotion !== state.emotion) {
      sm.setEmotion(emotion);
      onEmotionChange?.(emotion);
    }
  }, [emotion, sm, onEmotionChange, state.emotion]);

  useEffect(() => {
    if (gesture !== state.gesture) {
      sm.playGesture(gesture);
    }
  }, [gesture, sm, state.gesture]);

  useEffect(() => {
    if (isSpeaking) {
      sm.startSpeaking();
    } else {
      sm.stopSpeaking();
    }
  }, [isSpeaking, sm]);

  useEffect(() => {
    if (gaze && !enableCursorTracking) {
      sm.setGaze(gaze.x, gaze.y);
    }
  }, [gaze, enableCursorTracking, sm]);

  useEffect(() => {
    sm.startAutoBlinking(enableBlinking);
    return () => sm.stopAutoBlinking();
  }, [enableBlinking, sm]);

  // Cursor tracking
  useEffect(() => {
    if (!enableCursorTracking) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      sm.setGaze(dx, dy);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableCursorTracking, sm]);

  // Expõe API imperativa para refs
  useImperativeHandle(
    ref,
    (): AvatarAPI => ({
      setEmotion: (emo: Emotion) => {
        sm.setEmotion(emo);
        onEmotionChange?.(emo);
      },
      playGesture: (gest: Gesture, durationMs?: number) => {
        sm.playGesture(gest, durationMs);
      },
      startSpeaking: () => sm.startSpeaking(),
      stopSpeaking: () => sm.stopSpeaking(),
      setGaze: (x: number, y: number) => sm.setGaze(x, y),
      blink: () => sm.blink(),
      getState: () => sm.getState(),
    }),
    [sm, onEmotionChange]
  );

  const profile = EMOTION_PROFILES[state.emotion] || EMOTION_PROFILES.neutral;

  const cssVariables: Record<string, string> = {
    '--head-tilt': `${state.headTilt}deg`,
    '--gaze-x': `${state.gaze.x}`,
    '--gaze-y': `${state.gaze.y}`,
    '--eb-l-y': `${profile.eyebrowOffset.left.y}px`,
    '--eb-l-rot': `${profile.eyebrowOffset.left.rotate}deg`,
    '--eb-r-y': `${profile.eyebrowOffset.right.y}px`,
    '--eb-r-rot': `${profile.eyebrowOffset.right.rotate}deg`,
  };

  const containerClasses = [
    'embasa-avatar-container',
    `emotion-${state.emotion}`,
    `gesture-${state.gesture}`,
    `mouth-${state.mouth}`,
    `eye-${state.eyeState}`,
    state.isSpeaking ? 'is-speaking' : '',
    state.isBlinking ? 'is-blinking' : '',
    enableBreathing ? 'is-breathing' : '',
    enableIdleMovement ? 'is-idle-moving' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const dimension = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{
        width: dimension,
        height: dimension,
        ...cssVariables,
        ...style,
      }}
      aria-label={`Avatar Embasa - ${state.emotion}`}
    >
      <svg
        className="embasa-avatar-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        role="img"
      >
        <defs dangerouslySetInnerHTML={{ __html: EMBASA_GRADIENTS }} />

        {/* 1. Body (Gota base & sombreamento) */}
        <g id="body">{renderPaths('body')}</g>

        {/* 2. Head (Topo da gota & brilhos de iluminação) */}
        <g id="head">{renderPaths('head')}</g>

        {/* 3. Ribbon (Fita característica com as cores da Embasa) */}
        <g id="ribbon">{renderPaths('ribbon')}</g>

        {/* 4. Pernas e Pés */}
        <g id="left-leg">{renderPaths('left-leg')}</g>
        <g id="left-foot">{renderPaths('left-foot')}</g>
        <g id="right-leg">{renderPaths('right-leg')}</g>
        <g id="right-foot">{renderPaths('right-foot')}</g>

        {/* 5. Braços e Mãos */}
        <g id="left-arm">{renderPaths('left-arm')}</g>
        <g id="left-hand">{renderPaths('left-hand')}</g>
        <g id="right-arm">{renderPaths('right-arm')}</g>
        <g id="right-hand">{renderPaths('right-hand')}</g>

        {/* 6. Olhos, Pupilas e Sobrancelhas */}
        <g id="left-eye">{renderPaths('left-eye')}</g>
        <g id="left-pupil">{renderPaths('left-pupil')}</g>
        <g id="right-eye">{renderPaths('right-eye')}</g>
        <g id="right-pupil">{renderPaths('right-pupil')}</g>
        <g id="left-eyebrow">{renderPaths('left-eyebrow')}</g>
        <g id="right-eyebrow">{renderPaths('right-eyebrow')}</g>

        {/* 7. Boca */}
        <g id="mouth">{renderPaths('mouth')}</g>
      </svg>
    </div>
  );
});

EmbasaAvatar.displayName = 'EmbasaAvatar';
