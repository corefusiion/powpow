import { useRef, useState, useCallback } from 'react';
import { AvatarAPI, Emotion, Gesture, GazeCoords, AvatarState } from './types';

export function useEmbasaAvatar(
  initialEmotion: Emotion = 'neutral',
  initialGesture: Gesture = 'idle'
) {
  const avatarRef = useRef<AvatarAPI | null>(null);
  const [emotion, setEmotionState] = useState<Emotion>(initialEmotion);
  const [gesture, setGestureState] = useState<Gesture>(initialGesture);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [gaze, setGazeState] = useState<GazeCoords>({ x: 0, y: 0 });

  const setEmotion = useCallback((emo: Emotion) => {
    setEmotionState(emo);
    avatarRef.current?.setEmotion(emo);
  }, []);

  const playGesture = useCallback((gest: Gesture, durationMs?: number) => {
    setGestureState(gest);
    avatarRef.current?.playGesture(gest, durationMs);
  }, []);

  const startSpeaking = useCallback(() => {
    setIsSpeaking(true);
    avatarRef.current?.startSpeaking();
  }, []);

  const stopSpeaking = useCallback(() => {
    setIsSpeaking(false);
    avatarRef.current?.stopSpeaking();
  }, []);

  const setGaze = useCallback((x: number, y: number) => {
    setGazeState({ x, y });
    avatarRef.current?.setGaze(x, y);
  }, []);

  const blink = useCallback(() => {
    avatarRef.current?.blink();
  }, []);

  const getState = useCallback((): AvatarState | null => {
    return avatarRef.current?.getState() ?? null;
  }, []);

  return {
    avatarRef,
    emotion,
    gesture,
    isSpeaking,
    gaze,
    setEmotion,
    playGesture,
    startSpeaking,
    stopSpeaking,
    setGaze,
    blink,
    getState,
  };
}
