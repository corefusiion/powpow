// Page Mascot definitions (adapted from nilbuild/page-mascot)
// Provides 52 interactive mascots categorized into Animals, People, and Robots.
// Every mascot is directly renderable via <dot-pal character="...">

export const PAGE_MASCOTS = [
  // ── Animais (Animals) ──
  { id: 'fox', label: 'Raposa (Fox)', category: 'animals', color: '#e06822' },
  { id: 'cat', label: 'Gato (Cat)', category: 'animals', color: '#9c6f50' },
  { id: 'pug', label: 'Pug (Cachorro)', category: 'animals', color: '#c49a6c' },
  { id: 'panda', label: 'Panda', category: 'animals', color: '#2b2d42' },
  { id: 'bunny', label: 'Coelho (Bunny)', category: 'animals', color: '#f8a5c2' },
  { id: 'bear', label: 'Urso (Bear)', category: 'animals', color: '#8d5b4c' },
  { id: 'otter', label: 'Lontra (Otter)', category: 'animals', color: '#855d44' },
  { id: 'penguin', label: 'Pinguim (Penguin)', category: 'animals', color: '#1e3799' },
  { id: 'owl', label: 'Coruja (Owl)', category: 'animals', color: '#6a4a3c' },
  { id: 'dino', label: 'Dinossauro (Dino)', category: 'animals', color: '#44bd32' },
  { id: 'frog', label: 'Sapo (Frog)', category: 'animals', color: '#4cd137' },
  { id: 'koala', label: 'Coala (Koala)', category: 'animals', color: '#718093' },
  { id: 'hamster', label: 'Hamster', category: 'animals', color: '#e1b12c' },
  { id: 'hedgehog', label: 'Ouriço (Hedgehog)', category: 'animals', color: '#795548' },
  { id: 'raccoon', label: 'Guaxinim (Raccoon)', category: 'animals', color: '#57606f' },
  { id: 'redpanda', label: 'Panda Vermelho', category: 'animals', color: '#e55039' },
  { id: 'sloth', label: 'Preguiça (Sloth)', category: 'animals', color: '#8c7ae6' },
  { id: 'tiger', label: 'Tigre (Tiger)', category: 'animals', color: '#f39c12' },
  { id: 'sheep', label: 'Ovelha (Sheep)', category: 'animals', color: '#a4b0be' },
  { id: 'deer', label: 'Cervo (Deer)', category: 'animals', color: '#a0522d' },
  { id: 'mouse', label: 'Ratinho (Mouse)', category: 'animals', color: '#95a5a6' },

  // ── Personagens (People) ──
  { id: 'astronaut', label: 'Astronauta', category: 'people', color: '#38ada9' },
  { id: 'wizard', label: 'Mago (Wizard)', category: 'people', color: '#6c5ce7' },
  { id: 'knight', label: 'Cavaleiro (Knight)', category: 'people', color: '#636e72' },
  { id: 'pirate', label: 'Pirata (Pirate)', category: 'people', color: '#d63031' },
  { id: 'scientist', label: 'Cientista', category: 'people', color: '#0984e3' },
  { id: 'chef', label: 'Chef de Cozinha', category: 'people', color: '#fab1a0' },
  { id: 'nurse', label: 'Enfermeiro(a)', category: 'people', color: '#e84393' },
  { id: 'builder', label: 'Construtor', category: 'people', color: '#f1c40f' },
  { id: 'skater', label: 'Skatista', category: 'people', color: '#00cec9' },
  { id: 'scout', label: 'Escoteiro', category: 'people', color: '#27ae60' },
  { id: 'kamran', label: 'Kamran (Criador)', category: 'people', color: '#2d3436' },
  { id: 'afro', label: 'Afro Hero', category: 'people', color: '#e17055' },
  { id: 'ballerina', label: 'Bailarina', category: 'people', color: '#fd79a8' },
  { id: 'hijabi', label: 'Hijabi', category: 'people', color: '#00b894' },
  { id: 'sikh', label: 'Sikh', category: 'people', color: '#fdcb6e' },
  { id: 'glasses', label: 'Óculos (Geek)', category: 'people', color: '#74b9ff' },
  { id: 'cap', label: 'Boné (Cap)', category: 'people', color: '#e84118' },
  { id: 'beard', label: 'Barbudo (Beard)', category: 'people', color: '#795548' },
  { id: 'bald', label: 'Carequinha', category: 'people', color: '#dcdde1' },
  { id: 'grandpa', label: 'Vovô (Grandpa)', category: 'people', color: '#b2bec3' },
  { id: 'granny', label: 'Vovó (Granny)', category: 'people', color: '#ff7675' },

  // ── Robôs & Criaturas (Robots) ──
  { id: 'robot', label: 'Robô (Robot)', category: 'robots', color: '#0984e3' },
  { id: 'postbot', label: 'Postbot', category: 'robots', color: '#e17055' },
  { id: 'gearbot', label: 'Engrenagem (Gearbot)', category: 'robots', color: '#b71540' },
  { id: 'clockwork', label: 'Corda (Clockwork)', category: 'robots', color: '#e58e26' },
  { id: 'drone', label: 'Drone Aéreo', category: 'robots', color: '#3dc1d3' },
  { id: 'cube', label: 'Cubo Tecnológico', category: 'robots', color: '#574b90' },
  { id: 'crt', label: 'Monitor CRT', category: 'robots', color: '#303952' },
  { id: 'tv', label: 'Televisor Retro', category: 'robots', color: '#596275' },
  { id: 'radio', label: 'Rádio Boombox', category: 'robots', color: '#f78fb3' },
  { id: 'toaster', label: 'Torradeira Bot', category: 'robots', color: '#f3a683' },
  { id: 'lantern', label: 'Lanterna Mágica', category: 'robots', color: '#f8a5c2' },
  { id: 'rocket', label: 'Foguete (Rocket)', category: 'robots', color: '#ea2027' },
];

const CELL_SIZE = 184;
const TOTAL_SIZE = CELL_SIZE * 3; // 552
const VIEW_X = 8;
const VIEW_Y = 16;

const LOOK_GRID = [
  [2, 1], // 0: right (0 deg)
  [2, 2], // 1: down-right (45 deg)
  [1, 2], // 2: down (90 deg)
  [0, 2], // 3: down-left (135 deg)
  [0, 1], // 4: left (180 deg)
  [0, 0], // 5: up-left (-135 deg)
  [1, 0], // 6: up (-90 deg)
  [2, 0], // 7: up-right (-45 deg)
];

function calcSpriteOffset(x, y) {
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

function renderCategoryLegs(m) {
  if (m.category === 'robots') {
    return `
      <!-- Articulated Left Robotic Leg -->
      <g class="dp-leg-l" style="transform-origin: 74px 124px">
        <circle cx="74" cy="124" r="6" fill="#181c24" stroke="${m.color}" stroke-width="1.4"/>
        <rect x="66" y="126" width="16" height="24" rx="3" fill="#2d3340" stroke="#1d222b" stroke-width="1.2"/>
        <line x1="74" y1="128" x2="74" y2="146" stroke="${m.color}" stroke-width="1.8" opacity="0.85"/>
        <rect x="68" y="150" width="12" height="6" rx="2" fill="#181c24" stroke="${m.color}" stroke-width="1"/>
        <path d="M66 156 L82 156 L80 170 L68 170 Z" fill="#2d3340" stroke="#1d222b" stroke-width="1.2"/>
        <path class="dp-foot-l" d="M58 184 L64 170 L82 170 L88 184 Z" fill="#181c24" stroke="#2d3340" stroke-width="1.2"/>
        <rect x="60" y="184" width="26" height="2.5" rx="1" fill="${m.color}"/>
      </g>
      <!-- Articulated Right Robotic Leg -->
      <g class="dp-leg-r" style="transform-origin: 126px 124px">
        <circle cx="126" cy="124" r="6" fill="#181c24" stroke="${m.color}" stroke-width="1.4"/>
        <rect x="118" y="126" width="16" height="24" rx="3" fill="#2d3340" stroke="#1d222b" stroke-width="1.2"/>
        <line x1="126" y1="128" x2="126" y2="146" stroke="${m.color}" stroke-width="1.8" opacity="0.85"/>
        <rect x="120" y="150" width="12" height="6" rx="2" fill="#181c24" stroke="${m.color}" stroke-width="1"/>
        <path d="M118 156 L134 156 L132 170 L120 170 Z" fill="#2d3340" stroke="#1d222b" stroke-width="1.2"/>
        <path class="dp-foot-r" d="M112 184 L118 170 L136 170 L142 184 Z" fill="#181c24" stroke="#2d3340" stroke-width="1.2"/>
        <rect x="114" y="184" width="26" height="2.5" rx="1" fill="${m.color}"/>
      </g>
    `;
  }
  if (m.category === 'people') {
    return `
      <!-- Articulated Left Person Leg -->
      <g class="dp-leg-l" style="transform-origin: 74px 124px">
        <rect x="65" y="124" width="18" height="28" rx="5" fill="#2d3442"/>
        <line x1="67" y1="150" x2="81" y2="150" stroke="#1d222b" stroke-width="1.5"/>
        <rect x="67" y="152" width="14" height="16" rx="4" fill="#2d3442"/>
        <path class="dp-foot-l" d="M58 184 C56 172 64 166 74 166 C84 166 90 172 92 184 Z" fill="#ffffff" stroke="#2d3442" stroke-width="1.2"/>
        <rect x="56" y="183.5" width="38" height="3.5" rx="1.5" fill="#e0e0e0" stroke="#999999" stroke-width="0.8"/>
        <ellipse cx="74" cy="174" rx="6" ry="2" fill="${m.color}" opacity="0.8"/>
      </g>
      <!-- Articulated Right Person Leg -->
      <g class="dp-leg-r" style="transform-origin: 126px 124px">
        <rect x="117" y="124" width="18" height="28" rx="5" fill="#2d3442"/>
        <line x1="119" y1="150" x2="133" y2="150" stroke="#1d222b" stroke-width="1.5"/>
        <rect x="119" y="152" width="14" height="16" rx="4" fill="#2d3442"/>
        <path class="dp-foot-r" d="M108 184 C106 172 114 166 124 166 C134 166 140 172 142 184 Z" fill="#ffffff" stroke="#2d3442" stroke-width="1.2"/>
        <rect x="106" y="183.5" width="38" height="3.5" rx="1.5" fill="#e0e0e0" stroke="#999999" stroke-width="0.8"/>
        <ellipse cx="124" cy="174" rx="6" ry="2" fill="${m.color}" opacity="0.8"/>
      </g>
    `;
  }
  // Animals (default)
  return `
    <!-- Articulated Left Animal Leg -->
    <g class="dp-leg-l" style="transform-origin: 74px 124px">
      <path d="M64 124 C60 134 62 146 66 154 C70 156 80 156 84 154 C88 146 86 134 82 124 Z" fill="${m.color}"/>
      <circle cx="75" cy="154" r="3" fill="#ffffff" opacity="0.35"/>
      <path d="M67 154 L69 168 L81 168 L83 154 Z" fill="${m.color}" opacity="0.92"/>
      <path class="dp-foot-l" d="M60 184 C58 172 66 168 75 168 C84 168 90 172 92 184 Z" fill="${m.color}"/>
      <circle cx="66" cy="184" r="2.8" fill="#ffffff" opacity="0.4"/>
      <circle cx="75" cy="185" r="3" fill="#ffffff" opacity="0.4"/>
      <circle cx="84" cy="184" r="2.8" fill="#ffffff" opacity="0.4"/>
    </g>
    <!-- Articulated Right Animal Leg -->
    <g class="dp-leg-r" style="transform-origin: 126px 124px">
      <path d="M118 124 C114 134 116 146 120 154 C124 156 134 156 138 154 C142 146 140 134 136 124 Z" fill="${m.color}"/>
      <circle cx="125" cy="154" r="3" fill="#ffffff" opacity="0.35"/>
      <path d="M117 154 L119 168 L131 168 L133 154 Z" fill="${m.color}" opacity="0.92"/>
      <path class="dp-foot-r" d="M108 184 C106 172 114 168 123 168 C132 168 138 172 140 184 Z" fill="${m.color}"/>
      <circle cx="114" cy="184" r="2.8" fill="#ffffff" opacity="0.4"/>
      <circle cx="123" cy="185" r="3" fill="#ffffff" opacity="0.4"/>
      <circle cx="132" cy="184" r="2.8" fill="#ffffff" opacity="0.4"/>
    </g>
  `;
}

/**
 * Creates character definitions for all 52 page mascots.
 */
export function createPageMascotCharacters() {
  const defs = {};
  for (const m of PAGE_MASCOTS) {
    defs[m.id] = {
      label: m.label,
      color: m.color,
      category: m.category,
      fur: false,
      tap: 'jump',
      look: 5,
      eyes: { at: [[78, 56], [122, 56]], r: 10 },
      mouth: [100, 102],
      cheek: 36,
      onLook: (pal, x, y, svg) => {
        const img = svg.querySelector('.dp-mascot-img');
        if (!img) return;
        const offset = calcSpriteOffset(x, y);
        img.setAttribute('x', String(offset.x));
        img.setAttribute('y', String(offset.y));
      },
      render: ({ id }) => ({
        defs: `
          <clipPath id="${id('mascot_clip')}">
            <rect x="${VIEW_X}" y="${VIEW_Y}" width="${CELL_SIZE}" height="${CELL_SIZE}"/>
          </clipPath>
        `,
        body: `
          <!-- Soft floor contact shadow -->
          <ellipse class="dp-shadow" cx="100" cy="189" rx="46" ry="6.5" fill="#000000" opacity="0.2"/>
          <!-- Pelvic connector / hip waistline -->
          <path fill="${m.color}" opacity="0.95" d="M68 118 C66 124 72 128 82 130 C94 132 106 132 118 130 C128 128 134 124 132 118 Z"/>
          <!-- Category-matched Articulated Lower Body -->
          ${renderCategoryLegs(m)}
          <!-- Mascot Interactive 3x3 Sprite Bust -->
          <g transform="translate(38.5, 4) scale(0.67)">
            <g clip-path="url(#${id('mascot_clip')})">
              <image class="dp-mascot-img" href="/mascots/${m.id}-directions.webp"
                x="${VIEW_X - CELL_SIZE}" y="${VIEW_Y - CELL_SIZE}"
                width="${TOTAL_SIZE}" height="${TOTAL_SIZE}"
                preserveAspectRatio="none"/>
            </g>
          </g>
        `,
        accessories: '',
        face: '',
      }),
    };
  }
  return defs;
}
