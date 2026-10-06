import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { EMBASA_DEFS, EMBASA_INNER_SVG } from './EmbasaAvatarData';
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
    const unsub = sm.subscribe((next) => {
      setState(next);
      onEmotionChange?.(next.emotion);
      if (next.gesture === 'idle') {
        onGestureEnd?.();
      }
    });
    return unsub;
  }, [sm, onEmotionChange, onGestureEnd]);

  useEffect(() => {
    sm.setEmotion(emotion);
  }, [emotion, sm]);

  useEffect(() => {
    if (gesture !== 'idle') {
      sm.playGesture(gesture);
    }
  }, [gesture, sm]);

  useEffect(() => {
    if (isSpeaking) {
      sm.startSpeaking();
    } else {
      sm.stopSpeaking();
    }
  }, [isSpeaking, sm]);

  useEffect(() => {
    sm.setGaze(gaze.x, gaze.y);
  }, [gaze.x, gaze.y, sm]);

  useEffect(() => {
    sm.startAutoBlinking(enableBlinking);
  }, [enableBlinking, sm]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
      sm.setGaze(nx, ny);
    },
    [sm]
  );

  useEffect(() => {
    if (!enableCursorTracking) return;
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableCursorTracking, handleMouseMove]);

  useImperativeHandle(
    ref,
    (): AvatarAPI => ({
      setEmotion: (emo: Emotion) => sm.setEmotion(emo),
      playGesture: (gst: Gesture, durationMs?: number) => sm.playGesture(gst, durationMs),
      startSpeaking: () => sm.startSpeaking(),
      stopSpeaking: () => sm.stopSpeaking(),
      setGaze: (x: number, y: number) => sm.setGaze(x, y),
      getSemanticElement: (id: string) => {
        return containerRef.current?.querySelector(`#${id}`) as SVGElement | null;
      },
      getState: () => sm.getState(),
    }),
    [sm]
  );

  const profile = EMOTION_PROFILES[state.emotion] || EMOTION_PROFILES.neutral;

  const cssVariables = {
    '--head-tilt': `${state.headTilt}deg`,
    '--gaze-x': `${state.gaze.x}`,
    '--gaze-y': `${state.gaze.y}`,
    '--eb-l-y': `${profile.eyebrowOffset.left.y}px`,
    '--eb-l-rot': `${profile.eyebrowOffset.left.rotate}deg`,
    '--eb-r-y': `${profile.eyebrowOffset.right.y}px`,
    '--eb-r-rot': `${profile.eyebrowOffset.right.rotate}deg`,
  } as React.CSSProperties;

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
        style={{ overflow: 'visible' }}
      >
        <defs dangerouslySetInnerHTML={{ __html: EMBASA_DEFS }} />
        <g dangerouslySetInnerHTML={{ __html: EMBASA_INNER_SVG }} />
      </svg>
    </div>
  );
});

EmbasaAvatar.displayName = 'EmbasaAvatar';
