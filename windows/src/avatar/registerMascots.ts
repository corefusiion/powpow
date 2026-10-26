import { characters, registerCharacter } from '../../../src/characters.js';
import { MASCOTS_CATALOG } from './mascotCatalog';

const CELL_SIZE = 184;
const TOTAL_SIZE = CELL_SIZE * 3;
const VIEW_X = 8;
const VIEW_Y = 16;

const LOOK_GRID = [
  [2, 1], // right (0 deg)
  [2, 2], // down-right (45 deg)
  [1, 2], // down (90 deg)
  [0, 2], // down-left (135 deg)
  [0, 1], // left (180 deg)
  [0, 0], // up-left (-135 deg)
  [1, 0], // up (-90 deg)
  [2, 0], // up-right (-45 deg)
];

function calcSpriteOffset(x: number, y: number) {
  let col = 1;
  let row = 1;
  if (Math.hypot(x, y) >= 0.18) {
    const angle = Math.atan2(y, x);
    const sector = (Math.round((angle / (Math.PI * 2)) * 8) + 8) % 8;
    [col, row] = LOOK_GRID[sector];
  }
  return {
    x: VIEW_X - col * CELL_SIZE,
    y: VIEW_Y - row * CELL_SIZE,
  };
}

/**
 * Registra todos os mascotes do page-mascot no runtime do DotPal/Powpow,
 * permitindo que sejam selecionados em <dot-pal character="..."> em qualquer lugar da aplicação.
 */
export function registerAllPageMascots() {
  for (const mascot of MASCOTS_CATALOG) {
    if (mascot.id === 'embasa' || (characters as Record<string, any>)[mascot.id]) {
      continue;
    }

    if (mascot.id === 'vault') {
      registerCharacter('vault', {
        label: 'Mascote Original',
        color: '#1E6BB8',
        fur: false,
        tap: 'jump',
        look: 4,
        mouth: [100, 160],
        cheek: 36,
        render: () => ({
          defs: `
            <style>
              .dp-vault-pose { display: none; }
              .dp-vault-idle { display: block; }
              :host([data-pose="walk"]) .dp-vault-idle,
              .dp-root[data-pose="walk"] .dp-vault-idle { display: none !important; }
              :host([data-pose="walk"]) .dp-vault-walk,
              .dp-root[data-pose="walk"] .dp-vault-walk { display: block !important; }
              :host([data-pose="sit"]) .dp-vault-idle,
              .dp-root[data-pose="sit"] .dp-vault-idle { display: none !important; }
              :host([data-pose="sit"]) .dp-vault-sit,
              .dp-root[data-pose="sit"] .dp-vault-sit { display: block !important; }
              :host([data-pose="think"]) .dp-vault-idle,
              .dp-root[data-pose="think"] .dp-vault-idle { display: none !important; }
              :host([data-pose="think"]) .dp-vault-think,
              .dp-root[data-pose="think"] .dp-vault-think { display: block !important; }
              :host([data-pose="celebrate"]) .dp-vault-idle,
              .dp-root[data-pose="celebrate"] .dp-vault-idle { display: none !important; }
              :host([data-pose="celebrate"]) .dp-vault-celebrate,
              .dp-root[data-pose="celebrate"] .dp-vault-celebrate { display: block !important; }
            </style>
          `,
          body: `
            <!-- Sombra de aterramento -->
            <ellipse cx="100" cy="196" rx="46" ry="8" fill="#000000" opacity="0.16"/>
            <!-- Mascote Oficial 100% Autêntico com Poses Dinâmicas -->
            <g class="dp-actor dp-vault-official">
              <image class="dp-vault-pose dp-vault-idle" href="/avatar/vaultboy/official_frontal_128.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
              <image class="dp-vault-pose dp-vault-walk" href="/avatar/vaultboy/walking_128.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
              <image class="dp-vault-pose dp-vault-sit" href="/avatar/vaultboy/sitting_128.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
              <image class="dp-vault-pose dp-vault-think" href="/avatar/vaultboy/thinking_128.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
              <image class="dp-vault-pose dp-vault-celebrate" href="/avatar/vaultboy/celebrating_128.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
            </g>
          `,
          accessories: '',
          face: '',
        }),
      });
      continue;
    }

    if (mascot.id === 'doraemon') {
      registerCharacter('doraemon', {
        label: 'Doraemon',
        color: '#009fe8',
        fur: false,
        tap: 'jump',
        look: 4,
        mouth: [100, 160],
        cheek: 36,
        render: () => ({
          defs: `
            <style>
              .dp-dora-pose { display: none; }
              .dp-dora-idle { display: block; }
              :host([data-pose="walk"]) .dp-dora-idle,
              .dp-root[data-pose="walk"] .dp-dora-idle { display: none !important; }
              :host([data-pose="walk"]) .dp-dora-walk,
              .dp-root[data-pose="walk"] .dp-dora-walk { display: block !important; }
              :host([data-pose="sit"]) .dp-dora-idle,
              .dp-root[data-pose="sit"] .dp-dora-idle { display: none !important; }
              :host([data-pose="sit"]) .dp-dora-sit,
              .dp-root[data-pose="sit"] .dp-dora-sit { display: block !important; }
              :host([data-pose="think"]) .dp-dora-idle,
              .dp-root[data-pose="think"] .dp-dora-idle { display: none !important; }
              :host([data-pose="think"]) .dp-dora-think,
              .dp-root[data-pose="think"] .dp-dora-think { display: block !important; }
              :host([data-pose="celebrate"]) .dp-dora-idle,
              .dp-root[data-pose="celebrate"] .dp-dora-idle { display: none !important; }
              :host([data-pose="celebrate"]) .dp-dora-celebrate,
              .dp-root[data-pose="celebrate"] .dp-dora-celebrate { display: block !important; }
            </style>
          `,
          body: `
            <!-- Sombra de aterramento -->
            <ellipse cx="100" cy="196" rx="46" ry="8" fill="#000000" opacity="0.16"/>
            <!-- Doraemon Oficial Dinâmico -->
            <g class="dp-actor dp-doraemon">
              <image class="dp-dora-pose dp-dora-idle" href="/avatar/doraemon/shime1.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
              <image class="dp-dora-pose dp-dora-walk" href="/avatar/doraemon/action-walk-01.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
              <image class="dp-dora-pose dp-dora-sit" href="/avatar/doraemon/action-rest-01.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
              <image class="dp-dora-pose dp-dora-think" href="/avatar/doraemon/action-coding_thinking-01.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
              <image class="dp-dora-pose dp-dora-celebrate" href="/avatar/doraemon/action-take_copter-01.png" x="25" y="15" width="150" height="185" preserveAspectRatio="contain"/>
            </g>
          `,
          accessories: '',
          face: '',
        }),
      });
      continue;
    }

    registerCharacter(mascot.id, {
      label: mascot.name,
      color: mascot.color,
      fur: false,
      tap: 'jump',
      look: 5,
      mouth: [100, 172],
      cheek: 36,
      onLook: (_pal: any, x: number, y: number, svg: SVGSVGElement) => {
        const img = svg.querySelector('.dp-mascot-img');
        if (!img) return;
        const offset = calcSpriteOffset(x, y);
        img.setAttribute('x', String(offset.x));
        img.setAttribute('y', String(offset.y));
      },
      render: ({ id }: { id: (name: string) => string }) => ({
        defs: `
          <clipPath id="${id('mascot_clip')}">
            <rect x="${VIEW_X}" y="${VIEW_Y}" width="${CELL_SIZE}" height="${CELL_SIZE}"/>
          </clipPath>
        `,
        body: `
          <!-- Soft floor shadow for grounding -->
          <ellipse cx="100" cy="196" rx="46" ry="8" fill="#000000" opacity="0.14"/>
          <!-- Mascot Interactive 3x3 Sprite Layer: 100% transparent background, tracks mouse -->
          <g clip-path="url(#${id('mascot_clip')})">
            <image class="dp-mascot-img" href="/mascots/${mascot.id}-directions.webp"
              x="${VIEW_X - CELL_SIZE}" y="${VIEW_Y - CELL_SIZE}"
              width="${TOTAL_SIZE}" height="${TOTAL_SIZE}"
              preserveAspectRatio="none"/>
          </g>
        `,
        accessories: '',
        face: '',
      }),
    });
  }
}
