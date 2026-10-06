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
            <g class="dp-blink">
              <image class="dp-mascot-img" href="/mascots/${mascot.id}-directions.webp"
                x="${VIEW_X - CELL_SIZE}" y="${VIEW_Y - CELL_SIZE}"
                width="${TOTAL_SIZE}" height="${TOTAL_SIZE}"
                preserveAspectRatio="none"/>
            </g>
          </g>
        `,
        accessories: '',
        face: '',
      }),
    });
  }
}
