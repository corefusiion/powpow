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
        look: 6,
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

              @keyframes vault-subtle-sway {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-4px) rotate(1.5deg); }
              }
              .dp-vault-official {
                animation: vault-subtle-sway 3s ease-in-out infinite;
                transform-origin: 50% 90%;
              }
              @keyframes vault-arm-pulse {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(-5deg); }
              }
              .dp-vault-arm-layer {
                animation: vault-arm-pulse 2s ease-in-out infinite;
                transform-origin: 135px 110px;
              }
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
              <!-- Olhos Dinâmicos 2D com Rastreamento Interativo do Mouse -->
              <g class="dp-vault-pose dp-vault-idle">
                <g class="dp-look">
                  <g class="dp-blink">
                    <circle cx="91" cy="74" r="3.2" fill="#0b0b12"/>
                    <circle cx="90" cy="73" r="1.1" fill="#ffffff"/>
                    <circle cx="112" cy="74" r="3.2" fill="#0b0b12"/>
                    <circle cx="111" cy="73" r="1.1" fill="#ffffff"/>
                  </g>
                </g>
              </g>
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
        look: 7,
        mouth: [100, 160],
        cheek: 36,
        render: () => ({
          defs: `
            <style>
              .dp-dora-pose { display: none; }
              .dp-dora-interactive { display: block; }
              :host([data-pose="walk"]) .dp-dora-interactive,
              .dp-root[data-pose="walk"] .dp-dora-interactive { display: none !important; }
              :host([data-pose="walk"]) .dp-dora-walk,
              .dp-root[data-pose="walk"] .dp-dora-walk { display: block !important; }
              :host([data-pose="sit"]) .dp-dora-interactive,
              .dp-root[data-pose="sit"] .dp-dora-interactive { display: none !important; }
              :host([data-pose="sit"]) .dp-dora-sit,
              .dp-root[data-pose="sit"] .dp-dora-sit { display: block !important; }
              :host([data-pose="think"]) .dp-dora-interactive,
              .dp-root[data-pose="think"] .dp-dora-interactive { display: none !important; }
              :host([data-pose="think"]) .dp-dora-think,
              .dp-root[data-pose="think"] .dp-dora-think { display: block !important; }
              :host([data-pose="celebrate"]) .dp-dora-interactive,
              .dp-root[data-pose="celebrate"] .dp-dora-interactive { display: none !important; }
              :host([data-pose="celebrate"]) .dp-dora-celebrate,
              .dp-root[data-pose="celebrate"] .dp-dora-celebrate { display: block !important; }

              @keyframes dora-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
              }
              .dp-doraemon-actor {
                animation: dora-float 3s ease-in-out infinite;
                transform-origin: 50% 90%;
              }
              @keyframes dora-wave-hand {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(-26deg); }
              }
              .dp-dora-wave-arm {
                animation: dora-wave-hand 1.5s ease-in-out infinite;
                transform-origin: 136px 132px;
              }
            </style>
          `,
          body: `
            <!-- Sombra de aterramento -->
            <ellipse cx="100" cy="195" rx="46" ry="8" fill="#000000" opacity="0.16"/>
            <!-- Doraemon 2D Articulado com Olhos Seguindo o Mouse e Braço Balançando -->
            <g class="dp-actor dp-doraemon-actor">
              <!-- Mascote Doraemon Vetorial Interativo Dinâmico (Idle) -->
              <g class="dp-dora-interactive">
                <!-- Pés brancos no chão -->
                <ellipse cx="78" cy="188" rx="18" ry="9" fill="#ffffff" stroke="#003554" stroke-width="2.5"/>
                <ellipse cx="122" cy="188" rx="18" ry="9" fill="#ffffff" stroke="#003554" stroke-width="2.5"/>

                <!-- Corpo Azul -->
                <path d="M66 126 C52 168 64 186 78 186 L122 186 C136 186 148 168 134 126 Z"
                  fill="#009fe8" stroke="#003554" stroke-width="3" stroke-linejoin="round"/>

                <!-- Braço Esquerdo Apoiado com Mão Esférica Branca -->
                <path d="M68 130 C48 142 46 156 50 168" fill="none" stroke="#009fe8" stroke-width="15" stroke-linecap="round"/>
                <circle cx="48" cy="170" r="11" fill="#ffffff" stroke="#003554" stroke-width="2.5"/>

                <!-- Barriga Branca Redonda -->
                <circle cx="100" cy="154" r="28" fill="#ffffff" stroke="#003554" stroke-width="2.5"/>

                <!-- Bolso Mágico Quadridimensional 4D -->
                <path d="M78 152 Q100 152 122 152 Q122 174 100 174 Q78 174 78 152 Z"
                  fill="#ffffff" stroke="#003554" stroke-width="2.2"/>
                <path d="M77 152 L123 152" stroke="#003554" stroke-width="2.2"/>

                <!-- Braço Direito Acenando Alegremente (Balança o Braço!) -->
                <g class="dp-dora-wave-arm">
                  <path d="M132 130 C146 120 158 112 166 104" fill="none" stroke="#009fe8" stroke-width="15" stroke-linecap="round"/>
                  <circle cx="168" cy="102" r="11" fill="#ffffff" stroke="#003554" stroke-width="2.5"/>
                </g>

                <!-- Cabeça Redonda Azul Icônica -->
                <circle cx="100" cy="78" r="56" fill="#009fe8" stroke="#003554" stroke-width="3"/>

                <!-- Rosto Branco Oval Clássico -->
                <ellipse cx="100" cy="86" rx="46" ry="40" fill="#ffffff" stroke="#003554" stroke-width="2.5"/>

                <!-- Coleira Vermelha e Guizo (Sino) Dourado -->
                <rect x="68" y="122" width="64" height="10" rx="5" fill="#e74c3c" stroke="#003554" stroke-width="2.5"/>
                <circle cx="100" cy="132" r="9" fill="#f1c40f" stroke="#003554" stroke-width="2"/>
                <circle cx="100" cy="133" r="2" fill="#003554"/>
                <line x1="91" y1="130" x2="109" y2="130" stroke="#003554" stroke-width="1.8"/>

                <!-- Bigodinhos Pretos Característicos (3 de cada lado) -->
                <g stroke="#003554" stroke-width="2" stroke-linecap="round">
                  <line x1="92" y1="82" x2="62" y2="76"/>
                  <line x1="92" y1="88" x2="58" y2="88"/>
                  <line x1="92" y1="94" x2="62" y2="100"/>
                  <line x1="108" y1="82" x2="138" y2="76"/>
                  <line x1="108" y1="88" x2="142" y2="88"/>
                  <line x1="108" y1="94" x2="138" y2="100"/>
                </g>

                <!-- Nariz Vermelho Clássico com Brilho -->
                <circle cx="100" cy="74" r="8.5" fill="#e74c3c" stroke="#003554" stroke-width="2.2"/>
                <circle cx="98" cy="71.5" r="2.2" fill="#ffffff"/>

                <!-- Linha do Nariz à Boca -->
                <line x1="100" y1="82.5" x2="100" y2="100" stroke="#003554" stroke-width="2.2"/>

                <!-- Boca Sorridente Simpática com Língua Rosa -->
                <path d="M72 96 Q100 126 128 96" fill="#c0392b" stroke="#003554" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M84 105 Q100 96 116 105 Q100 124 84 105" fill="#ff7675"/>

                <!-- Olhos Brancos Grandes Ovais Juntos no Centro -->
                <g>
                  <ellipse cx="88" cy="58" rx="12" ry="16" fill="#ffffff" stroke="#003554" stroke-width="2.5"/>
                  <ellipse cx="112" cy="58" rx="12" ry="16" fill="#ffffff" stroke="#003554" stroke-width="2.5"/>
                </g>

                <!-- Pupilas Dinâmicas que Seguem o Cursor do Mouse em 360° com Piscar! -->
                <g class="dp-look">
                  <g class="dp-blink">
                    <circle cx="89" cy="58" r="4.2" fill="#0b0b12"/>
                    <circle cx="87.5" cy="56" r="1.5" fill="#ffffff"/>
                    <circle cx="111" cy="58" r="4.2" fill="#0b0b12"/>
                    <circle cx="109.5" cy="56" r="1.5" fill="#ffffff"/>
                  </g>
                </g>
              </g>

              <!-- Poses Especiais de Ação (Walk, Sit, Think, Celebrate) -->
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
