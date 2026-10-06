/**
 * Page Mascot Component — Portado e melhorado de nilbuild/page-mascot
 * Permite renderizar mascotes interativos com sprite sheet 3x3 para direções e reações.
 * Suporta rastreamento direcional do cursor e animação de boop/squash ao clicar.
 */

export const DIRECTIONS = [
  'up-left',
  'up',
  'up-right',
  'left',
  'center',
  'right',
  'down-left',
  'down',
  'down-right',
] as const;

export const REACTIONS = [
  'blink',
  'heart',
  'sparkle',
  'surprised',
  'wink',
  'bashful',
  'sleepy',
  'dizzy',
  'delighted',
] as const;

export type MascotDirection = (typeof DIRECTIONS)[number];
export type MascotReaction = (typeof REACTIONS)[number];

const CLOCKWISE: MascotDirection[] = [
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
];

const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 60;
const PAYOFFS: MascotReaction[] = ['heart', 'sparkle', 'delighted'];
const BOOP_PAYOFF = 120;
const BOOP_END = 560;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1100;

const SQUASH: Keyframe[] = [
  { transform: 'scale(1, 1)', easing: 'ease-in' },
  { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
  { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
  { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
  { transform: 'scale(1, 1)' },
];

function cellPos(index: number): { x: string; y: string } {
  return {
    x: `${(index % 3) * 50}%`,
    y: `${Math.floor(index / 3) * 50}%`,
  };
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export class PageMascotElement extends HTMLElement {
  private buttonEl: HTMLButtonElement;
  private squashEl: HTMLSpanElement;
  private dirLayer: HTMLSpanElement;
  private reactLayer: HTMLSpanElement;

  private timers: number[] = [];
  private boops = { count: 0, at: 0 };
  private currentDir: MascotDirection = 'center';
  private currentReact: MascotReaction | null = null;
  private moveListener?: (e: PointerEvent) => void;
  private scrollListener?: () => void;

  private _directions: string = '';
  private _reactions: string = '';
  private _size: number = 130;
  private _character: string = 'fox';

  constructor() {
    super();

    this.buttonEl = document.createElement('button');
    this.buttonEl.type = 'button';
    this.buttonEl.style.position = 'relative';
    this.buttonEl.style.display = 'block';
    this.buttonEl.style.flexShrink = '0';
    this.buttonEl.style.padding = '0';
    this.buttonEl.style.border = '0';
    this.buttonEl.style.background = 'transparent';
    this.buttonEl.style.appearance = 'none';
    this.buttonEl.style.cursor = 'pointer';
    this.buttonEl.style.userSelect = 'none';

    this.squashEl = document.createElement('span');
    this.squashEl.style.position = 'relative';
    this.squashEl.style.display = 'block';
    this.squashEl.style.width = '100%';
    this.squashEl.style.height = '100%';
    this.squashEl.style.transformOrigin = '50% 78%';

    const makeLayer = () => {
      const el = document.createElement('span');
      el.style.position = 'absolute';
      el.style.inset = '0';
      el.style.backgroundSize = '300% 300%';
      el.style.backgroundRepeat = 'no-repeat';
      return el;
    };

    this.dirLayer = makeLayer();
    this.dirLayer.style.opacity = '1';

    this.reactLayer = makeLayer();
    this.reactLayer.style.opacity = '0';

    this.squashEl.appendChild(this.dirLayer);
    this.squashEl.appendChild(this.reactLayer);
    this.buttonEl.appendChild(this.squashEl);
  }

  static get observedAttributes() {
    return ['character', 'directions', 'reactions', 'size'];
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string) {
    if (name === 'character') {
      this.setCharacter(newVal);
    } else if (name === 'directions') {
      this.directions = newVal;
    } else if (name === 'reactions') {
      this.reactions = newVal;
    } else if (name === 'size') {
      this.size = parseInt(newVal, 10) || 130;
    }
  }

  connectedCallback() {
    if (!this.contains(this.buttonEl)) {
      this.appendChild(this.buttonEl);
    }

    if (!this._directions && this.hasAttribute('character')) {
      this.setCharacter(this.getAttribute('character')!);
    } else if (!this._directions && !this._reactions) {
      this.setCharacter(this._character);
    }

    this.updateSize();
    this.setupTracking();

    this.buttonEl.onclick = (e) => {
      e.stopPropagation();
      this.boop();
    };
  }

  disconnectedCallback() {
    this.removeTracking();
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  public setCharacter(char: string) {
    this._character = char;
    this.directions = `/mascots/${char}-directions.webp`;
    this.reactions = `/mascots/${char}-reactions.webp`;
    this.buttonEl.setAttribute('aria-label', `Mascote ${char}`);
  }

  get directions(): string {
    return this._directions;
  }
  set directions(val: string) {
    this._directions = val;
    this.dirLayer.style.backgroundImage = `url("${val}")`;
    this.updateLayerStyles();
  }

  get reactions(): string {
    return this._reactions;
  }
  set reactions(val: string) {
    this._reactions = val;
    this.reactLayer.style.backgroundImage = `url("${val}")`;
    this.updateLayerStyles();
  }

  get size(): number {
    return this._size;
  }
  set size(val: number) {
    this._size = val;
    this.updateSize();
  }

  private updateSize() {
    this.buttonEl.style.width = `${this._size}px`;
    this.buttonEl.style.height = `${this._size}px`;
  }

  private updateLayerStyles() {
    const dirIdx = DIRECTIONS.indexOf(this.currentDir);
    const pDir = cellPos(dirIdx !== -1 ? dirIdx : 4);
    this.dirLayer.style.backgroundPosition = `${pDir.x} ${pDir.y}`;
    this.dirLayer.style.opacity = this.currentReact ? '0' : '1';

    const reactIdx = REACTIONS.indexOf(this.currentReact ?? 'blink');
    const pReact = cellPos(reactIdx !== -1 ? reactIdx : 0);
    this.reactLayer.style.backgroundPosition = `${pReact.x} ${pReact.y}`;
    this.reactLayer.style.opacity = this.currentReact ? '1' : '0';
  }

  public boop() {
    this.timers.forEach(clearTimeout);
    this.timers = [];

    const later = (ms: number, next: MascotReaction | null) => {
      this.timers.push(
        window.setTimeout(() => {
          this.currentReact = next;
          this.updateLayerStyles();
        }, ms)
      );
    };

    const now = Date.now();
    this.boops.count = now - this.boops.at < DIZZY_WINDOW ? this.boops.count + 1 : 1;
    this.boops.at = now;

    if (this.boops.count >= DIZZY_AFTER) {
      this.boops.count = 0;
      this.currentReact = 'dizzy';
      this.updateLayerStyles();
      later(DIZZY_END, null);
    } else {
      this.currentReact = 'blink';
      this.updateLayerStyles();
      later(BOOP_PAYOFF, PAYOFFS[(this.boops.count - 1) % PAYOFFS.length]);
      later(BOOP_END, null);
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.squashEl.animate(SQUASH, { duration: SQUASH_MS, easing: 'linear' });
    }
  }

  private setupTracking() {
    let sector = -1;
    let pointer: { x: number; y: number } | null = null;

    const aim = () => {
      if (!pointer) return;
      const box = this.buttonEl.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        if (this.currentDir !== 'center') {
          this.currentDir = 'center';
          this.updateLayerStyles();
        }
        return;
      }

      const angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) {
        return;
      }

      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      const nextDir = CLOCKWISE[sector];
      if (this.currentDir !== nextDir) {
        this.currentDir = nextDir;
        this.updateLayerStyles();
      }
    };

    this.moveListener = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      aim();
    };

    this.scrollListener = () => {
      aim();
    };

    window.addEventListener('pointermove', this.moveListener, { passive: true });
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  private removeTracking() {
    if (this.moveListener) {
      window.removeEventListener('pointermove', this.moveListener);
      this.moveListener = undefined;
    }
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = undefined;
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('page-mascot')) {
  customElements.define('page-mascot', PageMascotElement);
}
