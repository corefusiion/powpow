import { EMBASA_GRADIENTS, EMBASA_PARTS } from './avatar/EmbasaAvatarData';
import { AvatarStateMachine, EMOTION_PROFILES } from './avatar/stateMachine';
import type { Emotion, Gesture } from './avatar/types';
import './avatar/styles.css';

// 1. Build the avatar DOM structure with all 18 semantic IDs
function createAvatarDOM(): { root: HTMLDivElement } {
  const root = document.createElement('div');
  root.className = 'embasa-avatar-container is-breathing is-idle-moving';
  root.style.width = '320px';
  root.style.height = '320px';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'embasa-avatar-svg');
  svg.setAttribute('viewBox', '0 0 1024 1024');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = EMBASA_GRADIENTS;
  svg.appendChild(defs);

  const partOrder = [
    'body',
    'head',
    'ribbon',
    'left-leg',
    'left-foot',
    'right-leg',
    'right-foot',
    'left-arm',
    'left-hand',
    'right-arm',
    'right-hand',
    'left-eye',
    'left-pupil',
    'right-eye',
    'right-pupil',
    'left-eyebrow',
    'right-eyebrow',
    'mouth',
  ];

  for (const partName of partOrder) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = partName;
    const paths = EMBASA_PARTS[partName] || [];
    for (const p of paths) {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', p.d);
      if (p.fill) pathEl.setAttribute('fill', p.fill);
      if (p.fillOpacity) pathEl.setAttribute('fill-opacity', p.fillOpacity);
      g.appendChild(pathEl);
    }
    svg.appendChild(g);
  }

  root.appendChild(svg);
  return { root };
}

// 2. Initialize State Machine and mount
const mount = document.getElementById('avatar-mount')!;
const { root } = createAvatarDOM();
mount.appendChild(root);

const sm = new AvatarStateMachine('neutral', 'idle');
sm.startAutoBlinking(true);

const statusLabel = document.getElementById('status-label')!;
const codePreview = document.getElementById('code-preview')!;
const gazeReticle = document.getElementById('gaze-reticle')!;

// Synchronize state with DOM
sm.subscribe((st) => {
  const profile = EMOTION_PROFILES[st.emotion] || EMOTION_PROFILES.neutral;

  // Root class names
  root.className = [
    'embasa-avatar-container',
    `emotion-${st.emotion}`,
    `gesture-${st.gesture}`,
    `mouth-${st.mouth}`,
    `eye-${st.eyeState}`,
    st.isSpeaking ? 'is-speaking' : '',
    st.isBlinking ? 'is-blinking' : '',
    (document.getElementById('toggle-breath') as HTMLInputElement)?.checked ? 'is-breathing' : '',
    (document.getElementById('toggle-idle') as HTMLInputElement)?.checked ? 'is-idle-moving' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // CSS variables for head tilt, gaze, and eyebrows
  root.style.setProperty('--head-tilt', `${st.headTilt}deg`);
  root.style.setProperty('--gaze-x', `${st.gaze.x}`);
  root.style.setProperty('--gaze-y', `${st.gaze.y}`);
  root.style.setProperty('--eb-l-y', `${profile.eyebrowOffset.left.y}px`);
  root.style.setProperty('--eb-l-rot', `${profile.eyebrowOffset.left.rotate}deg`);
  root.style.setProperty('--eb-r-y', `${profile.eyebrowOffset.right.y}px`);
  root.style.setProperty('--eb-r-rot', `${profile.eyebrowOffset.right.rotate}deg`);

  // Status label
  statusLabel.textContent = `Emotion: ${st.emotion} | Gesture: ${st.gesture} | Mouth: ${st.mouth}`;
});

// 3. UI Controls Event Listeners
// Emotions
const emotionBtns = document.querySelectorAll<HTMLButtonElement>('#emotions-grid button');
emotionBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const emo = btn.getAttribute('data-emotion') as Emotion;
    emotionBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    sm.setEmotion(emo);
    codePreview.textContent = `avatar.setEmotion("${emo}");`;
  });
});

// Gestures
const gestureBtns = document.querySelectorAll<HTMLButtonElement>('#gestures-grid button');
gestureBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const gest = btn.getAttribute('data-gesture') as Gesture;
    gestureBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    sm.playGesture(gest, 3000);
    codePreview.textContent = `avatar.playGesture("${gest}");`;
  });
});

// Speech
document.getElementById('btn-speak-start')?.addEventListener('click', () => {
  sm.startSpeaking();
  codePreview.textContent = `avatar.startSpeaking();`;
});

document.getElementById('btn-speak-stop')?.addEventListener('click', () => {
  sm.stopSpeaking();
  codePreview.textContent = `avatar.stopSpeaking();`;
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

  sm.setGaze(nx, ny);
  codePreview.textContent = `avatar.setGaze(${nx.toFixed(2)}, ${ny.toFixed(2)});`;
}

gazePad.addEventListener('mousedown', (e) => {
  isDraggingGaze = true;
  updateGazeFromEvent(e);
});

window.addEventListener('mousemove', (e) => {
  if (isDraggingGaze) {
    updateGazeFromEvent(e);
  } else if ((document.getElementById('toggle-tracking') as HTMLInputElement)?.checked) {
    const rect = mount.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
    sm.setGaze(nx, ny);
  }
});

window.addEventListener('mouseup', () => {
  isDraggingGaze = false;
});

// Toggles
document.getElementById('toggle-blink')?.addEventListener('change', (e) => {
  const checked = (e.target as HTMLInputElement).checked;
  sm.startAutoBlinking(checked);
});

document.getElementById('toggle-breath')?.addEventListener('change', (e) => {
  const checked = (e.target as HTMLInputElement).checked;
  root.classList.toggle('is-breathing', checked);
});

document.getElementById('toggle-idle')?.addEventListener('change', (e) => {
  const checked = (e.target as HTMLInputElement).checked;
  root.classList.toggle('is-idle-moving', checked);
});
