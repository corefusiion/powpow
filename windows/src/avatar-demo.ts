import { EmbasaAvatarElement } from './avatar/EmbasaAvatarElement';
import type { Emotion, Gesture } from './avatar/types';
import { DotPal } from '../../src/index.js';

// 1. Instancia o avatar interativo de alta resolução (Web Component)
const mount = document.getElementById('avatar-mount')!;
const avatarEl = new EmbasaAvatarElement();
mount.appendChild(avatarEl);

const statusLabel = document.getElementById('status-label')!;
const codePreview = document.getElementById('code-preview')!;
const gazeReticle = document.getElementById('gaze-reticle')!;

// 2. Mini Roaming Pal (Desktop Pal & Terminal)
const miniPal = document.getElementById('demo-mini-pal') as DotPal | null;
const miniSpeechInput = document.getElementById('mini-speech-input') as HTMLInputElement | null;
const miniWalkContainer = document.getElementById('mini-pal-walkway') as HTMLDivElement | null;

// 3. UI Controls para o Avatar Principal
const emotionBtns = document.querySelectorAll<HTMLButtonElement>('#emotions-grid button');
emotionBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const emo = btn.getAttribute('data-emotion') as Emotion;
    emotionBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    avatarEl.setEmotion(emo);
    statusLabel.textContent = `Emotion: ${emo} | Idle`;
    codePreview.textContent = `avatar.setEmotion("${emo}");`;

    // Também sincroniza com o mini pal caso o usuário queira ver a reação
    if (miniPal) {
      if (emo === 'happy') miniPal.setState('done');
      else if (emo === 'thinking') miniPal.setState('thinking');
      else if (emo === 'surprised') void miniPal.emote('wide');
      else if (emo === 'error') miniPal.setState('error');
      else if (emo === 'sad') miniPal.setState('error');
      else if (emo === 'excited') void miniPal.play('jump');
      else miniPal.setState('idle');
    }
  });
});

// Gestos
const gestureBtns = document.querySelectorAll<HTMLButtonElement>('#gestures-grid button');
gestureBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const gest = btn.getAttribute('data-gesture') as Gesture;
    gestureBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    avatarEl.playGesture(gest, 3200);
    codePreview.textContent = `avatar.playGesture("${gest}");`;

    if (miniPal) {
      if (gest === 'wave') void miniPal.play('hello');
      else if (gest === 'thumbs-up') void miniPal.emote('star');
      else if (gest === 'celebrating') void miniPal.play('jump');
      else if (gest === 'thinking') miniPal.setState('thinking');
      else void miniPal.play('wiggle');
    }
  });
});

// Fala (Speech)
document.getElementById('btn-speak-start')?.addEventListener('click', () => {
  avatarEl.startSpeaking();
  codePreview.textContent = `avatar.startSpeaking();`;
  if (miniPal) miniPal.say('Tratando a água com qualidade e carinho!');
});

document.getElementById('btn-speak-stop')?.addEventListener('click', () => {
  avatarEl.stopSpeaking();
  codePreview.textContent = `avatar.stopSpeaking();`;
  if (miniPal) miniPal.say('');
});

// Gaze Pad
const gazePad = document.getElementById('gaze-pad')!;
let isDraggingGaze = false;

function updateGazeFromEvent(e: MouseEvent) {
  const rect = gazePad.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

  const nx = ((x / rect.width) * 2 - 1);
  const ny = ((y / rect.height) * 2 - 1);

  gazeReticle.style.left = `${(x / rect.width) * 100}%`;
  gazeReticle.style.top = `${(y / rect.height) * 100}%`;

  avatarEl.setGaze(nx, ny);
  codePreview.textContent = `avatar.setGaze(${nx.toFixed(2)}, ${ny.toFixed(2)});`;

  if (miniPal) {
    miniPal.lookAt(nx, ny);
  }
}

gazePad.addEventListener('mousedown', (e) => {
  isDraggingGaze = true;
  updateGazeFromEvent(e);
});

window.addEventListener('mousemove', (e) => {
  if (isDraggingGaze) {
    updateGazeFromEvent(e);
  }
});

window.addEventListener('mouseup', () => {
  isDraggingGaze = false;
});

// Toggles
const toggleBreath = document.getElementById('toggle-breath') as HTMLInputElement | null;
toggleBreath?.addEventListener('change', () => {
  const container = avatarEl.querySelector('.embasa-avatar-container');
  container?.classList.toggle('is-breathing', toggleBreath.checked);
});

const toggleIdle = document.getElementById('toggle-idle') as HTMLInputElement | null;
toggleIdle?.addEventListener('change', () => {
  const container = avatarEl.querySelector('.embasa-avatar-container');
  container?.classList.toggle('is-idle-moving', toggleIdle.checked);
});

const toggleTracking = document.getElementById('toggle-tracking') as HTMLInputElement | null;
toggleTracking?.addEventListener('change', () => {
  avatarEl.enableCursorTracking(!!toggleTracking?.checked);
});

// 4. Controles do Mini Roaming Pal
document.querySelectorAll<HTMLButtonElement>('[data-mini-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const act = btn.getAttribute('data-mini-action');
    if (!miniPal || !act) return;
    if (act.startsWith('emote:')) {
      void miniPal.emote(act.split(':')[1] as any);
    } else {
      void miniPal.play(act);
    }
  });
});

document.getElementById('btn-mini-say')?.addEventListener('click', () => {
  const text = miniSpeechInput?.value.trim() || 'Cuidando da nossa água! 💧';
  miniPal?.say(text);
});

// Simulação de caminhada pela tela
let isWalking = false;
let walkInterval: number | null = null;
let walkPos = 20;
let walkDir = 1;

document.getElementById('btn-mini-walk')?.addEventListener('click', () => {
  if (!miniPal || !miniWalkContainer) return;
  isWalking = !isWalking;
  const btn = document.getElementById('btn-mini-walk') as HTMLButtonElement;
  if (isWalking) {
    btn.textContent = '⏹ Parar Caminhada';
    btn.classList.add('active');
    miniPal.idle = 'bounce';
    walkInterval = window.setInterval(() => {
      const max = miniWalkContainer.clientWidth - 110;
      walkPos += walkDir * 4;
      if (walkPos > max) {
        walkDir = -1;
        miniPal.style.transform = 'scaleX(-1)';
      } else if (walkPos < 10) {
        walkDir = 1;
        miniPal.style.transform = 'scaleX(1)';
      }
      miniPal.style.left = `${walkPos}px`;
    }, 50);
  } else {
    btn.textContent = '🚶 Andar pela Tela';
    btn.classList.remove('active');
    if (walkInterval) clearInterval(walkInterval);
    miniPal.idle = 'float';
    miniPal.style.transform = 'scaleX(1)';
  }
});
