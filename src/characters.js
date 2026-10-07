// Character definitions.
//
// Every character is drawn in a 200×200 viewBox and sits on the bottom edge,
// "peeking" up like the pals in the reference art. Bodies extend below the
// viewBox (to y≈260+) so that when a pal jumps, more body is revealed instead
// of a flat cut-off edge.
//
// A character is an object:
//   label      – human readable name (used for aria-label)
//   color      – default body color (hex)
//   tap        – action played when the pal is clicked
//   look       – how far (in viewBox units) the `.dp-look` parts can move
//   mouth      – [x, y] where mood mouths are drawn
//   cheek      – horizontal distance of the blush from the mouth
//   eyes       – optional { at: [[x, y], [x, y]], r, ink?, glow?, own? }: where the two
//                eyes are and how big, so the pal can swap in expression eyes
//                (happy arcs, hearts…). Without it the normal eyes just squint.
//                `own` lists expressions its own eyes already do (e.g. 'wide').
//   render(p)  – returns { defs, body, accessories, face } SVG strings
//
// `render` receives:
//   p.id(name) – returns an id unique to this instance (for gradients etc.)
//   p.body     – url() of the fluffy body gradient
//   p.fur      – url() of the fur filter
//
// Class hooks used by the element:
//   .dp-blink  – scaled vertically when the pal blinks
//   .dp-look   – translated toward the pointer
//   .dp-eyes   – (optional) the parts hidden while expression eyes show;
//                without it, the .dp-blink parts are hidden

import { createPageMascotCharacters, PAGE_MASCOTS } from './pageMascots.js';

const eyeShine = (cx, cy, r = 2.6) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity=".9"/>`;

export const characters = {
  blu: {
    label: 'Blu',
    color: '#1e88ff',
    tap: 'jump',
    look: 6,
    mouth: [102, 138],
    cheek: 34,
    eyes: { at: [[86, 120], [118, 120]], r: 10 },
    render: ({ id, body, fur }) => ({
      defs: `
        <radialGradient id="${id('beret')}" gradientUnits="userSpaceOnUse" cx="70" cy="50" r="110">
          <stop offset="0" stop-color="#4a4a4a"/>
          <stop offset=".6" stop-color="#1a1a1a"/>
          <stop offset="1" stop-color="#050505"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="46" ry="6.5" fill="#000000" opacity="0.22"/>
        <!-- Articulated Left Leg: Volumetric thigh, knee, and stylish leather boot -->
        <g class="dp-leg-l" style="transform-origin: 74px 144px">
          <!-- Thigh & Knee -->
          <path d="M66 144 C62 148 64 158 66 164 C70 166 80 166 84 164 C86 158 84 148 82 144 Z" fill="${body}"/>
          <circle cx="75" cy="164" r="3.2" fill="#5cb3ff" opacity="0.5"/>
          <!-- Boot cuff & leather artist boot matching beret -->
          <rect x="63" y="167" width="22" height="5.5" rx="2.5" fill="#2d2d34"/>
          <path class="dp-foot-l" d="M58 184 C56 176 64 172 74 172 C84 172 90 176 92 184 C92 186 58 186 58 184 Z" fill="url(#${id('beret')})"/>
          <path d="M58 184 Q75 186.5 92 184" stroke="#000000" stroke-width="2.2" stroke-linecap="round"/>
          <ellipse cx="75" cy="178" rx="7" ry="2.2" fill="#ffffff" opacity="0.25"/>
        </g>
        <!-- Articulated Right Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 144px">
          <!-- Thigh & Knee -->
          <path d="M118 144 C116 148 114 158 116 164 C120 166 130 166 134 164 C138 158 136 148 134 144 Z" fill="${body}"/>
          <circle cx="125" cy="164" r="3.2" fill="#5cb3ff" opacity="0.5"/>
          <!-- Boot cuff & leather boot -->
          <rect x="115" y="167" width="22" height="5.5" rx="2.5" fill="#2d2d34"/>
          <path class="dp-foot-r" d="M108 184 C106 176 114 172 124 172 C134 172 140 176 142 184 C142 186 108 186 108 184 Z" fill="url(#${id('beret')})"/>
          <path d="M108 184 Q125 186.5 142 184" stroke="#000000" stroke-width="2.2" stroke-linecap="round"/>
          <ellipse cx="125" cy="178" rx="7" ry="2.2" fill="#ffffff" opacity="0.25"/>
        </g>
        <!-- Torso with natural chibi waistline at y=144 -->
        <path class="dp-torso" fill="${body}" d="M22 136 C16 116 28 98 56 94 C76 90 124 90 144 94 C172 98 184 116 178 136 C170 146 148 148 100 148 C52 148 30 146 22 136 Z"/>
        <!-- Fluffy Arms -->
        <g class="dp-arm-l" style="transform-origin: 26px 132px">
          <ellipse cx="24" cy="138" rx="8" ry="14" transform="rotate(18 24 138)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 176px 132px">
          <ellipse cx="178" cy="138" rx="8" ry="14" transform="rotate(-18 178 138)" fill="${body}"/>
        </g>`,
      accessories: `
        <g filter="${fur}" fill="url(#${id('beret')})">
          <ellipse cx="98" cy="98" rx="84" ry="26" transform="rotate(-6 98 98)"/>
          <ellipse cx="94" cy="80" rx="70" ry="34" transform="rotate(-6 94 80)"/>
          <path d="M80 50 L85 38 L91 49 Z"/>
          <circle cx="85" cy="36" r="10.5"/>
        </g>`,
      face: `
        <g class="dp-look">
          <g class="dp-blink">
            <ellipse cx="86" cy="120" rx="7.5" ry="12" fill="#0b0b12"/>
            <ellipse cx="118" cy="120" rx="7.5" ry="12" fill="#0b0b12"/>
            ${eyeShine(84, 114, 2)}${eyeShine(116, 114, 2)}
          </g>
        </g>`,
    }),
  },

  hop: {
    label: 'Hop',
    color: '#8be22e',
    tap: 'jump',
    look: 8,
    mouth: [100, 132],
    cheek: 52,
    eyes: { at: [[64, 94], [136, 94]], r: 17, own: ['wide'] },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('eyeball')}" cx=".4" cy=".35" r=".7">
          <stop offset="0" stop-color="#fff"/>
          <stop offset=".75" stop-color="#f1f1f1"/>
          <stop offset="1" stop-color="#c9c9c9"/>
        </radialGradient>
        <radialGradient id="${id('belly')}" cx=".5" cy=".5" r=".6">
          <stop offset="0" stop-color="#b6f74a"/>
          <stop offset="1" stop-color="#8be22e"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="54" ry="7" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Frog Leg: muscular flank thigh, springy knee, 3-toed webbed foot -->
        <g class="dp-leg-l" style="transform-origin: 58px 142px">
          <!-- Muscular bent frog thigh -->
          <path d="M58 142 C38 144 26 152 28 164 C30 172 42 172 50 168 C58 162 62 152 58 142 Z" fill="${body}"/>
          <circle cx="42" cy="162" r="3.5" fill="#b6f74a" opacity="0.6"/>
          <!-- Shin & Ankle -->
          <path d="M46 166 C48 172 52 175 54 176" stroke="${body}" stroke-width="8" stroke-linecap="round"/>
          <!-- Webbed foot with suction toe pads -->
          <path class="dp-foot-l" d="M34 184 C34 176 44 174 54 174 C62 174 72 176 72 184 Z" fill="${body}"/>
          <circle cx="36" cy="184" r="4.5" fill="${body}"/>
          <circle cx="36" cy="184" r="2.2" fill="#b6f74a"/>
          <circle cx="53" cy="185.5" r="4.8" fill="${body}"/>
          <circle cx="53" cy="185.5" r="2.4" fill="#b6f74a"/>
          <circle cx="70" cy="184" r="4.5" fill="${body}"/>
          <circle cx="70" cy="184" r="2.2" fill="#b6f74a"/>
        </g>
        <!-- Articulated Right Frog Leg -->
        <g class="dp-leg-r" style="transform-origin: 142px 142px">
          <!-- Muscular bent frog thigh -->
          <path d="M142 142 C162 144 174 152 172 164 C170 172 158 172 150 168 C142 162 138 152 142 142 Z" fill="${body}"/>
          <circle cx="158" cy="162" r="3.5" fill="#b6f74a" opacity="0.6"/>
          <!-- Shin & Ankle -->
          <path d="M154 166 C152 172 148 175 146 176" stroke="${body}" stroke-width="8" stroke-linecap="round"/>
          <!-- Webbed foot with suction toe pads -->
          <path class="dp-foot-r" d="M128 184 C128 176 138 174 146 174 C156 174 166 176 166 184 Z" fill="${body}"/>
          <circle cx="130" cy="184" r="4.5" fill="${body}"/>
          <circle cx="130" cy="184" r="2.2" fill="#b6f74a"/>
          <circle cx="147" cy="185.5" r="4.8" fill="${body}"/>
          <circle cx="147" cy="185.5" r="2.4" fill="#b6f74a"/>
          <circle cx="164" cy="184" r="4.5" fill="${body}"/>
          <circle cx="164" cy="184" r="2.2" fill="#b6f74a"/>
        </g>
        <!-- Frog Torso & Head -->
        <g class="dp-torso" fill="${body}">
          <path d="M24 136 C18 116 46 106 100 106 C154 106 182 116 176 136 C170 146 146 148 100 148 C54 148 30 146 24 136 Z"/>
          <ellipse cx="100" cy="136" rx="34" ry="14" fill="url(#${id('belly')})"/>
          <circle cx="64" cy="96" r="34"/>
          <circle cx="136" cy="96" r="34"/>
        </g>
        <!-- Cute frog arms -->
        <g class="dp-arm-l" style="transform-origin: 32px 140px">
          <path d="M30 138 C18 146 20 156 32 154" stroke="${body}" stroke-width="7" stroke-linecap="round" fill="none"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 168px 140px">
          <path d="M170 138 C182 146 180 156 168 154" stroke="${body}" stroke-width="7" stroke-linecap="round" fill="none"/>
        </g>`,
      accessories: '',
      face: [64, 136]
        .map(
          (cx) => `
        <g class="dp-blink">
          <circle cx="${cx}" cy="94" r="22" fill="url(#${id('eyeball')})"/>
          <g class="dp-look">
            <circle cx="${cx}" cy="94" r="12" fill="#0b0b12"/>
            ${eyeShine(cx - 4, 89, 3.2)}
          </g>
        </g>`
        )
        .join(''),
    }),
  },

  sunny: {
    label: 'Sunny',
    color: '#ffc21a',
    tap: 'wiggle',
    look: 4,
    mouth: [100, 136],
    cheek: 36,
    eyes: { at: [[74, 118], [126, 118]], r: 12 },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('belly')}" cx=".5" cy=".5" r=".6">
          <stop offset="0" stop-color="#fff5cc"/>
          <stop offset="1" stop-color="#ffc21a"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="48" ry="6.5" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Fox Leg: fluffy thigh, white fur sock, cute paw -->
        <g class="dp-leg-l" style="transform-origin: 74px 142px">
          <!-- Golden Thigh -->
          <path d="M66 142 C62 148 64 158 66 164 C70 166 80 166 84 164 C86 158 84 148 82 142 Z" fill="${body}"/>
          <!-- White fur ankle sock -->
          <rect x="67" y="164" width="14" height="10" rx="4" fill="#fff5cc"/>
          <!-- Fox paw with rounded toes -->
          <path class="dp-foot-l" d="M60 184 C58 176 66 174 74 174 C82 174 88 176 90 184 Z" fill="#f5aa00"/>
          <circle cx="66" cy="184" r="2.8" fill="#ffc21a"/>
          <circle cx="74" cy="185" r="3" fill="#ffc21a"/>
          <circle cx="82" cy="184" r="2.8" fill="#ffc21a"/>
        </g>
        <!-- Articulated Right Fox Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 142px">
          <!-- Golden Thigh -->
          <path d="M118 142 C116 148 114 158 116 164 C120 166 130 166 134 164 C138 158 136 148 134 142 Z" fill="${body}"/>
          <!-- White fur ankle sock -->
          <rect x="119" y="164" width="14" height="10" rx="4" fill="#fff5cc"/>
          <!-- Fox paw with rounded toes -->
          <path class="dp-foot-r" d="M110 184 C108 176 116 174 124 174 C132 174 138 176 140 184 Z" fill="#f5aa00"/>
          <circle cx="116" cy="184" r="2.8" fill="#ffc21a"/>
          <circle cx="124" cy="185" r="3" fill="#ffc21a"/>
          <circle cx="132" cy="184" r="2.8" fill="#ffc21a"/>
        </g>
        <!-- Fluffy Fox Tail on the side -->
        <g class="dp-tail" style="transform-origin: 164px 144px">
          <path d="M164 144 C194 134 204 108 190 96 C178 86 166 100 170 120 Z" fill="${body}"/>
          <path d="M190 96 C184 90 176 96 178 106 C184 104 188 100 190 96 Z" fill="#fff5cc"/>
        </g>
        <!-- Main Body with cream tummy -->
        <path class="dp-torso" fill="${body}" d="M24 136 C22 96 58 36 100 34 C142 36 178 96 176 136 C170 144 144 146 100 146 C56 146 30 144 24 136 Z"/>
        <ellipse cx="100" cy="136" rx="26" ry="12" fill="url(#${id('belly')})"/>
        <!-- Little arms -->
        <g class="dp-arm-l" style="transform-origin: 32px 132px">
          <ellipse cx="30" cy="138" rx="7" ry="13" transform="rotate(20 30 138)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 168px 132px">
          <ellipse cx="170" cy="138" rx="7" ry="13" transform="rotate(-20 170 138)" fill="${body}"/>
        </g>`,
      accessories: '',
      face: `
        <g class="dp-look" fill="none" stroke="#0b0b12" stroke-linecap="round">
          <path class="dp-eyes" stroke-width="4.5" d="M63 119 Q74 129 85 119 M115 119 Q126 129 137 119"/>
          <circle cx="74" cy="117" r="20" stroke-width="5" fill="#fff" fill-opacity=".08"/>
          <circle cx="126" cy="117" r="20" stroke-width="5" fill="#fff" fill-opacity=".08"/>
          <path stroke-width="4.5" d="M97 115 Q100 109 103 115 M51 115 L26 110 M149 115 L174 110"/>
        </g>`,
    }),
  },

  lovi: {
    label: 'Lovi',
    color: '#ff2fc4',
    tap: 'love',
    look: 5,
    mouth: [100, 138],
    cheek: 38,
    eyes: { at: [[76, 116], [124, 116]], r: 11, ink: '#fff' },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('lens')}" cx=".35" cy=".3" r=".8">
          <stop offset="0" stop-color="#3a3a44"/>
          <stop offset=".5" stop-color="#101014"/>
          <stop offset="1" stop-color="#000"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="42" ry="6" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Leg: slender stylish thigh, chic obsidian ankle boot -->
        <g class="dp-leg-l" style="transform-origin: 78px 146px">
          <!-- Magenta Thigh & Calf -->
          <rect x="73" y="146" width="11" height="20" rx="5" fill="#d81b99"/>
          <rect x="74" y="162" width="9" height="12" rx="4" fill="#d81b99"/>
          <!-- Designer ankle boot with patent shine -->
          <rect x="71" y="172" width="15" height="4.5" rx="2" fill="#2d2d3a"/>
          <path class="dp-foot-l" d="M64 184 C62 176 70 174 78 174 C86 174 90 178 92 184 Z" fill="#16161f"/>
          <rect x="64" y="184" width="7" height="2" fill="#111116"/>
          <line x1="64" y1="185.5" x2="92" y2="185.5" stroke="#111116" stroke-width="1.5"/>
          <ellipse cx="78" cy="179" rx="6" ry="2" fill="#ffffff" opacity="0.32"/>
        </g>
        <!-- Articulated Right Leg -->
        <g class="dp-leg-r" style="transform-origin: 122px 146px">
          <!-- Magenta Thigh & Calf -->
          <rect x="116" y="146" width="11" height="20" rx="5" fill="#d81b99"/>
          <rect x="117" y="162" width="9" height="12" rx="4" fill="#d81b99"/>
          <!-- Designer ankle boot with patent shine -->
          <rect x="114" y="172" width="15" height="4.5" rx="2" fill="#2d2d3a"/>
          <path class="dp-foot-r" d="M108 184 C106 176 114 174 122 174 C130 174 134 178 136 184 Z" fill="#16161f"/>
          <rect x="108" y="184" width="7" height="2" fill="#111116"/>
          <line x1="108" y1="185.5" x2="136" y2="185.5" stroke="#111116" stroke-width="1.5"/>
          <ellipse cx="122" cy="179" rx="6" ry="2" fill="#ffffff" opacity="0.32"/>
        </g>
        <!-- Heart body completed to waist tip at y=146 -->
        <path class="dp-torso" fill="${body}" d="M100 146 C64 138 18 124 18 90 C18 56 42 42 72 42 C88 42 96 50 100 62 C104 50 112 42 128 42 C158 42 182 56 182 90 C182 124 136 138 100 146 Z"/>
        <!-- Arms -->
        <g class="dp-arm-l" style="transform-origin: 28px 120px">
          <ellipse cx="26" cy="126" rx="6" ry="12" transform="rotate(16 26 126)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 172px 120px">
          <ellipse cx="174" cy="126" rx="6" ry="12" transform="rotate(-16 174 126)" fill="${body}"/>
        </g>`,
      accessories: '',
      face: `
        <g class="dp-look">
          <g stroke="#0b0b12" stroke-width="4.5" stroke-linecap="round" fill="none">
            <path d="M95 112 Q100 106 105 112 M58 110 L18 104 M142 110 L182 104"/>
          </g>
          <circle cx="76" cy="116" r="19" fill="url(#${id('lens')})"/>
          <circle cx="124" cy="116" r="19" fill="url(#${id('lens')})"/>
          <g class="dp-eyes">${eyeShine(69, 109, 3)}${eyeShine(117, 109, 3)}</g>
        </g>`,
    }),
  },

  // -- AI agent pals ---------------------------------------------------------

  muse: {
    label: 'Muse',
    color: '#9d6bff',
    tap: 'spin',
    look: 6,
    mouth: [100, 140],
    cheek: 36,
    eyes: { at: [[80, 122], [120, 122]], r: 11 },
    render: ({ id, body }) => ({
      defs: '',
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="46" ry="6.5" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Leg: lavender thigh, royal violet fantasy boot with gold buckle -->
        <g class="dp-leg-l" style="transform-origin: 76px 144px">
          <!-- Thigh & Knee -->
          <rect x="70" y="144" width="14" height="20" rx="5" fill="${body}"/>
          <circle cx="77" cy="164" r="3" fill="#c3a2ff" opacity="0.6"/>
          <!-- Boot cuff & gold star buckle -->
          <rect x="67" y="168" width="19" height="5.5" rx="2.5" fill="#5c2cb8"/>
          <circle cx="76" cy="170.5" r="2.5" fill="#fff3a6"/>
          <!-- Curled fantasy boot -->
          <path class="dp-foot-l" d="M60 184 C58 176 66 174 76 174 C86 174 92 178 94 184 Z" fill="#753cd8"/>
          <path d="M60 184 Q77 186.5 94 184" stroke="#481e96" stroke-width="2"/>
          <circle cx="86" cy="180" r="1.5" fill="#fff3a6" opacity="0.9"/>
        </g>
        <!-- Articulated Right Leg -->
        <g class="dp-leg-r" style="transform-origin: 124px 144px">
          <!-- Thigh & Knee -->
          <rect x="116" y="144" width="14" height="20" rx="5" fill="${body}"/>
          <circle cx="123" cy="164" r="3" fill="#c3a2ff" opacity="0.6"/>
          <!-- Boot cuff & gold buckle -->
          <rect x="114" y="168" width="19" height="5.5" rx="2.5" fill="#5c2cb8"/>
          <circle cx="124" cy="170.5" r="2.5" fill="#fff3a6"/>
          <!-- Curled fantasy boot -->
          <path class="dp-foot-r" d="M106 184 C104 176 114 174 124 174 C134 174 140 178 142 184 Z" fill="#753cd8"/>
          <path d="M106 184 Q123 186.5 142 184" stroke="#481e96" stroke-width="2"/>
          <circle cx="134" cy="180" r="1.5" fill="#fff3a6" opacity="0.9"/>
        </g>
        <!-- Torso with celestial curve and waist hem at y=144 -->
        <path class="dp-torso" fill="${body}" d="M24 136 C20 106 58 78 94 62 C88 46 100 30 118 34 C106 40 106 54 120 58 C162 78 180 106 176 136 C170 144 144 146 100 146 C56 146 30 144 24 136 Z"/>
        <path d="M46 140 Q100 148 154 140" stroke="#753cd8" stroke-width="4" stroke-linecap="round" fill="none"/>
        <!-- Celestial arms -->
        <g class="dp-arm-l" style="transform-origin: 24px 132px">
          <ellipse cx="22" cy="138" rx="7" ry="14" transform="rotate(18 22 138)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 176px 132px">
          <ellipse cx="178" cy="138" rx="7" ry="14" transform="rotate(-18 178 138)" fill="${body}"/>
        </g>`,
      accessories: `
        <path class="dp-sparkle" fill="#fff3a6" d="M156 30 Q159 44 172 47 Q159 50 156 64 Q153 50 140 47 Q153 44 156 30 Z"/>
        <path fill="#fff3a6" opacity=".8" d="M40 70 Q41.5 76 48 77.5 Q41.5 79 40 85 Q38.5 79 32 77.5 Q38.5 76 40 70 Z"/>`,
      face: `
        <g class="dp-look">
          ${[80, 120]
            .map(
              (cx, i) => `
            <g class="dp-blink">
              <ellipse cx="${cx}" cy="122" rx="8.5" ry="12" fill="#0b0b12"/>
              <path d="M${cx + (i ? 7 : -7)} 116 l${i ? 6 : -6} -5" stroke="#0b0b12" stroke-width="3.5" stroke-linecap="round"/>
              ${eyeShine(cx - 2.5, 116, 2.6)}
            </g>`
            )
            .join('')}
        </g>`,
    }),
  },

  grok: {
    label: 'Grok',
    color: '#4c5566',
    tap: 'nod',
    look: 10,
    mouth: [100, 136],
    cheek: 46,
    eyes: { at: [[76.5, 112], [123.5, 112]], r: 12, ink: '#dff4ff', glow: true },
    render: ({ id, body }) => ({
      defs: `
        <filter id="${id('glow')}" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="50" ry="7" fill="#000000" opacity="0.25"/>
        <!-- Articulated Left Robotic Leg: ball-joint hip, armored thigh, knee servo, magnetic glowing boot -->
        <g class="dp-leg-l" style="transform-origin: 72px 144px">
          <!-- Ball joint socket -->
          <circle cx="72" cy="144" r="7" fill="#181c24" stroke="#00d4ff" stroke-width="1.5"/>
          <!-- Armored thigh & power conduit -->
          <rect x="64" y="146" width="16" height="16" rx="3" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <line x1="72" y1="148" x2="72" y2="160" stroke="#00d4ff" stroke-width="2" opacity="0.8"/>
          <!-- Articulated knee servo -->
          <rect x="66" y="162" width="12" height="6" rx="2" fill="#181c24" stroke="#00d4ff" stroke-width="1.2"/>
          <!-- Shin guard -->
          <path d="M64 168 L80 168 L78 178 L66 178 Z" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <!-- Magnetized boot with glowing tread -->
          <path class="dp-foot-l" d="M56 184 L64 176 L82 176 L88 184 L88 186 L56 186 Z" fill="#181c24" stroke="#2d3340" stroke-width="1.5"/>
          <rect x="58" y="184" width="28" height="2.5" rx="1" fill="#00d4ff" filter="url(#${id('glow')})"/>
        </g>
        <!-- Articulated Right Robotic Leg -->
        <g class="dp-leg-r" style="transform-origin: 128px 144px">
          <!-- Ball joint socket -->
          <circle cx="128" cy="144" r="7" fill="#181c24" stroke="#00d4ff" stroke-width="1.5"/>
          <!-- Armored thigh & power conduit -->
          <rect x="120" y="146" width="16" height="16" rx="3" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <line x1="128" y1="148" x2="128" y2="160" stroke="#00d4ff" stroke-width="2" opacity="0.8"/>
          <!-- Knee servo -->
          <rect x="122" y="162" width="12" height="6" rx="2" fill="#181c24" stroke="#00d4ff" stroke-width="1.2"/>
          <!-- Shin guard -->
          <path d="M120 168 L136 168 L134 178 L122 178 Z" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <!-- Magnetized boot with glowing tread -->
          <path class="dp-foot-r" d="M112 184 L120 176 L138 176 L144 184 L144 186 L112 186 Z" fill="#181c24" stroke="#2d3340" stroke-width="1.5"/>
          <rect x="114" y="184" width="28" height="2.5" rx="1" fill="#00d4ff" filter="url(#${id('glow')})"/>
        </g>
        <!-- Robotic chassis body with utility belt -->
        <g class="dp-torso">
          <path fill="${body}" d="M24 96 C24 64 42 44 72 44 L128 44 C158 44 176 64 176 96 L176 140 L24 140 Z"/>
          <rect x="36" y="136" width="128" height="10" rx="3" fill="#1b202a" stroke="#2d3442" stroke-width="1.5"/>
          <rect x="92" y="134" width="16" height="14" rx="2" fill="#00d4ff" opacity="0.85"/>
        </g>
        <!-- Robotic clamp arms -->
        <g class="dp-arm-l" style="transform-origin: 18px 114px">
          <rect x="12" y="112" width="10" height="30" rx="5" fill="#2d3340"/>
          <circle cx="17" cy="144" r="5" fill="#00d4ff" opacity="0.8"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 182px 114px">
          <rect x="178" y="112" width="10" height="30" rx="5" fill="#2d3340"/>
          <circle cx="183" cy="144" r="5" fill="#00d4ff" opacity="0.8"/>
        </g>`,
      accessories: `
        <rect x="32" y="90" width="136" height="44" rx="22" fill="#0d1117" stroke="#252c38" stroke-width="3"/>
        <path d="M140 50 L118 84" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`,
      face: `
        <g class="dp-look" filter="url(#${id('glow')})" fill="#dff4ff">
          <g class="dp-blink"><rect x="68" y="99" width="17" height="26" rx="8.5"/></g>
          <g class="dp-blink"><rect x="115" y="99" width="17" height="26" rx="8.5"/></g>
        </g>`,
    }),
  },

  nova: {
    label: 'Nova',
    color: '#ff7a2f',
    tap: 'jump',
    look: 7,
    mouth: [100, 138],
    cheek: 40,
    eyes: { at: [[78, 120], [122, 120]], r: 11 },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('bulb')}" cx=".4" cy=".35" r=".7">
          <stop offset="0" stop-color="#fffbe6"/>
          <stop offset=".6" stop-color="#ffe066"/>
          <stop offset="1" stop-color="#ffb000"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="46" ry="6.5" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Leg: sporty pants, articulated knee, stylish high-top sneaker -->
        <g class="dp-leg-l" style="transform-origin: 74px 144px">
          <!-- Athletic pants thigh & calf -->
          <rect x="66" y="144" width="16" height="20" rx="5" fill="#c44300"/>
          <rect x="68" y="162" width="13" height="12" rx="4" fill="#c44300"/>
          <!-- High-top sneaker with racing stripe and rubber toe -->
          <path class="dp-foot-l" d="M58 184 C56 176 64 172 74 172 C84 172 90 176 92 184 Z" fill="#ffffff" stroke="#c44300" stroke-width="1.8"/>
          <path d="M64 180 Q74 176 84 180" stroke="#ff7a2f" stroke-width="2.5" fill="none"/>
          <path d="M86 180 C89 181 92 183 92 184 L86 184 Z" fill="#eeeeee"/>
          <rect x="57" y="183.5" width="36" height="3" rx="1.5" fill="#dddddd" stroke="#999999" stroke-width="0.8"/>
        </g>
        <!-- Articulated Right Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 144px">
          <!-- Athletic pants thigh & calf -->
          <rect x="118" y="144" width="16" height="20" rx="5" fill="#c44300"/>
          <rect x="119" y="162" width="13" height="12" rx="4" fill="#c44300"/>
          <!-- High-top sneaker -->
          <path class="dp-foot-r" d="M108 184 C106 176 114 172 124 172 C134 172 140 176 142 184 Z" fill="#ffffff" stroke="#c44300" stroke-width="1.8"/>
          <path d="M114 180 Q124 176 134 180" stroke="#ff7a2f" stroke-width="2.5" fill="none"/>
          <path d="M136 180 C139 181 142 183 142 184 L136 184 Z" fill="#eeeeee"/>
          <rect x="107" y="183.5" width="36" height="3" rx="1.5" fill="#dddddd" stroke="#999999" stroke-width="0.8"/>
        </g>
        <!-- Torso with hoodie waistband at y=144 -->
        <path class="dp-torso" fill="${body}" d="M24 136 C20 92 56 64 100 64 C144 64 180 92 176 136 C170 144 146 146 100 146 C54 146 30 144 24 136 Z"/>
        <rect x="44" y="138" width="112" height="7" rx="3.5" fill="#e05a10"/>
        <!-- Cute arms -->
        <g class="dp-arm-l" style="transform-origin: 22px 130px">
          <ellipse cx="20" cy="136" rx="8" ry="14" transform="rotate(18 20 136)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 178px 130px">
          <ellipse cx="180" cy="136" rx="8" ry="14" transform="rotate(-18 180 136)" fill="${body}"/>
        </g>`,
      accessories: `
        <path d="M100 68 C100 52 104 42 100 32" stroke="#2a2a33" stroke-width="5" stroke-linecap="round" fill="none"/>
        <circle class="dp-bulb" cx="100" cy="26" r="10" fill="url(#${id('bulb')})"/>`,
      face: `
        <g class="dp-look">
          <g class="dp-blink"><circle cx="78" cy="120" r="10.5" fill="#0b0b12"/>${eyeShine(75, 116, 3)}</g>
          <g class="dp-blink"><circle cx="122" cy="120" r="10.5" fill="#0b0b12"/>${eyeShine(119, 116, 3)}</g>
        </g>`,
    }),
  },

  embasa: {
    label: 'Embasa (Gota)',
    color: '#0495f4',
    fur: false,
    tap: 'jump',
    look: 8,
    mouth: [100, 136],
    cheek: 42,
    eyes: { at: [[76, 108], [124, 108]], r: 15, own: ['wide'] },
    render: ({ id }) => ({
      defs: `
        <radialGradient id="${id('drop_body')}" cx="36%" cy="28%" r="72%">
          <stop offset="0%" stop-color="#8ae0ff"/>
          <stop offset="22%" stop-color="#34c2fb"/>
          <stop offset="58%" stop-color="#0495f4"/>
          <stop offset="86%" stop-color="#0354b0"/>
          <stop offset="100%" stop-color="#012b6b"/>
        </radialGradient>
        <radialGradient id="${id('drop_sclera')}" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="82%" stop-color="#f0f8ff"/>
          <stop offset="100%" stop-color="#d4e8fc"/>
        </radialGradient>
        <linearGradient id="${id('ribbon_grad')}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6dc152"/>
          <stop offset="28%" stop-color="#f7f14e"/>
          <stop offset="52%" stop-color="#eb7200"/>
          <stop offset="76%" stop-color="#1fbcf0"/>
          <stop offset="100%" stop-color="#0454b0"/>
        </linearGradient>
        <linearGradient id="${id('limb_grad')}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38c6ff"/>
          <stop offset="100%" stop-color="#0467c4"/>
        </linearGradient>
        <linearGradient id="${id('foot_grad')}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#24baf8"/>
          <stop offset="100%" stop-color="#034898"/>
        </linearGradient>
      `,
      body: `
        <!-- Soft grounding shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="48" ry="6.5" fill="#000000" opacity="0.22"/>
        <!-- Articulated Left Water Leg: 3D droplet thigh, specular glints, water sneaker -->
        <g class="dp-leg-l" style="transform-origin: 74px 144px">
          <!-- 3D Water Thigh -->
          <path d="M62 144 C60 152 64 160 68 164 C74 166 82 166 86 162 C88 156 86 148 84 144 Z" fill="url(#${id('drop_body')})" stroke="#022e6b" stroke-width="1.2"/>
          <ellipse cx="73" cy="154" rx="3.5" ry="7" transform="rotate(-10 73 154)" fill="#ffffff" opacity="0.45"/>
          <circle cx="75" cy="164" r="3.2" fill="#8ae0ff" opacity="0.7"/>
          <!-- Droplet Shoe with water sole and specular shine -->
          <path class="dp-foot-l" d="M56 184 C54 176 62 170 74 170 C84 170 91 175 92 184 C92 186 56 186 56 184 Z" fill="url(#${id('foot_grad')})" stroke="#022e6b" stroke-width="1.2"/>
          <path d="M56 184 Q74 186.5 92 184" stroke="#012b6b" stroke-width="2.2" stroke-linecap="round"/>
          <ellipse cx="75" cy="176" rx="10" ry="3.5" fill="#99e8ff" opacity="0.85"/>
          <circle cx="68" cy="175" r="2" fill="#ffffff"/>
        </g>
        <!-- Articulated Right Water Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 144px">
          <!-- 3D Water Thigh -->
          <path d="M116 144 C114 148 112 156 114 162 C118 166 126 166 132 164 C136 160 140 152 138 144 Z" fill="url(#${id('drop_body')})" stroke="#022e6b" stroke-width="1.2"/>
          <ellipse cx="127" cy="154" rx="3.5" ry="7" transform="rotate(10 127 154)" fill="#ffffff" opacity="0.45"/>
          <circle cx="125" cy="164" r="3.2" fill="#8ae0ff" opacity="0.7"/>
          <!-- Droplet Shoe -->
          <path class="dp-foot-r" d="M108 184 C106 176 114 170 126 170 C136 170 143 175 144 184 C144 186 108 186 108 184 Z" fill="url(#${id('foot_grad')})" stroke="#022e6b" stroke-width="1.2"/>
          <path d="M108 184 Q126 186.5 144 184" stroke="#012b6b" stroke-width="2.2" stroke-linecap="round"/>
          <ellipse cx="125" cy="176" rx="10" ry="3.5" fill="#99e8ff" opacity="0.85"/>
          <circle cx="132" cy="175" r="2" fill="#ffffff"/>
        </g>
        <!-- Fluid Ribbon back pass -->
        <path fill="none" stroke="url(#${id('ribbon_grad')})" stroke-width="10" stroke-linecap="round" opacity="0.75"
          d="M36 136 C18 146 24 154 50 156 C80 158 120 158 150 154 C174 148 178 142 164 134"/>
        <!-- Main 3D Water Droplet Body tapering to waist at y=144 -->
        <g class="dp-torso">
          <path fill="url(#${id('drop_body')})" stroke="#022e6b" stroke-width="1.2"
            d="M100 20 C94 48 40 92 36 126 C34 138 52 144 100 144 C148 144 166 138 164 126 C160 92 106 48 100 20 Z"/>
          <!-- 3D Specular Highlight Crescent (Glossy Water Droplet) -->
          <path fill="#ffffff" opacity="0.45"
            d="M100 26 C96 48 46 92 44 122 C42 138 54 142 66 142 C50 138 46 126 50 114 C56 84 94 36 100 26 Z"/>
          <ellipse cx="84" cy="62" rx="7" ry="16" transform="rotate(-30 84 62)" fill="#ffffff" opacity="0.65"/>
          <circle cx="83" cy="58" r="3.2" fill="#ffffff" opacity="0.95"/>
          <!-- Soft inner reflection bottom right -->
          <path fill="#38bdf8" opacity="0.35" d="M142 110 C154 124 152 138 136 142 C146 136 148 124 142 110 Z"/>
        </g>
        <!-- Left Arm (Active pose) -->
        <g class="dp-arm-l" style="transform-origin: 36px 136px" fill="url(#${id('limb_grad')})">
          <path d="M42 126 C28 130 18 144 22 156 C24 162 32 162 38 154 C44 146 48 136 48 126 Z"/>
          <circle cx="24" cy="154" r="7"/>
          <circle cx="22" cy="150" r="3.5" fill="#8ae0ff"/>
        </g>
        <!-- Right Arm (Friendly waving / gesturing greeting) -->
        <g class="dp-arm-r" style="transform-origin: 164px 136px" fill="url(#${id('limb_grad')})">
          <path d="M158 126 C172 120 184 108 186 96 C186 90 176 90 172 98 C166 108 160 118 152 126 Z"/>
          <circle cx="184" cy="94" r="7"/>
          <circle cx="188" cy="88" r="3.8"/>
          <circle cx="182" cy="92" r="3.2" fill="#8ae0ff"/>
        </g>
      `,
      accessories: `
        <!-- Signature Embasa Fluid Ribbon (front swirl around waist) -->
        <path fill="none" stroke="url(#${id('ribbon_grad')})" stroke-width="12" stroke-linecap="round"
          d="M34 136 C64 148 136 148 166 136"/>
        <path fill="none" stroke="#6dc152" stroke-width="3" stroke-linecap="round" opacity="0.92"
          d="M40 140 C66 150 134 150 160 140"/>
        <!-- Ambient Water Droplets & Splashes -->
        <circle cx="34" cy="64" r="4.5" fill="#38bdf8" opacity="0.85"/>
        <circle cx="33" cy="62" r="1.8" fill="#ffffff" opacity="0.95"/>
        <circle cx="166" cy="68" r="5" fill="#38bdf8" opacity="0.85"/>
        <circle cx="164.5" cy="66" r="2" fill="#ffffff" opacity="0.95"/>
        <circle cx="174" cy="132" r="3.5" fill="#6dc152" opacity="0.75"/>
        <circle cx="28" cy="116" r="3.2" fill="#1fbcf0" opacity="0.75"/>
      `,
      face: `
        <!-- Cheerful Eyebrows -->
        <g fill="none" stroke="#0454b0" stroke-width="3.5" stroke-linecap="round">
          <path d="M64 88 Q76 81 88 88"/>
          <path d="M112 88 Q124 81 136 88"/>
        </g>
        <!-- Big Expressive Pixar Eyes (Follows cursor smoothly!) -->
        <g class="dp-blink">
          <!-- Left Eye Sclera (White) -->
          <ellipse cx="76" cy="108" rx="14" ry="17" fill="url(#${id('drop_sclera')})" stroke="#02285a" stroke-width="1.3"/>
          <!-- Left Eye Pupil & Iris (Tracks Mouse Cursor) -->
          <g class="dp-look">
            <ellipse cx="76.5" cy="108" rx="9.5" ry="12.5" fill="#021432"/>
            <!-- Vibrant blue iris reflection crescent -->
            <path d="M69 111 A8.5 9.5 0 0 0 84 111 A7.5 8.5 0 0 1 71 109 Z" fill="#0495f4"/>
            <ellipse cx="77.5" cy="112" rx="5" ry="3.5" fill="#38bdf8" opacity="0.85"/>
            <!-- Dual Specular Glints -->
            ${eyeShine(72.5, 102.5, 3.8)}
            ${eyeShine(80.5, 113.5, 1.8)}
          </g>
        </g>
        <g class="dp-blink">
          <!-- Right Eye Sclera (White) -->
          <ellipse cx="124" cy="108" rx="14" ry="17" fill="url(#${id('drop_sclera')})" stroke="#02285a" stroke-width="1.3"/>
          <!-- Right Eye Pupil & Iris (Tracks Mouse Cursor) -->
          <g class="dp-look">
            <ellipse cx="123.5" cy="108" rx="9.5" ry="12.5" fill="#021432"/>
            <!-- Vibrant blue iris reflection crescent -->
            <path d="M116 111 A8.5 9.5 0 0 0 131 111 A7.5 8.5 0 0 1 118 109 Z" fill="#0495f4"/>
            <ellipse cx="122.5" cy="112" rx="5" ry="3.5" fill="#38bdf8" opacity="0.85"/>
            <!-- Dual Specular Glints -->
            ${eyeShine(119.5, 102.5, 3.8)}
            ${eyeShine(127.5, 113.5, 1.8)}
          </g>
        </g>
      `,
    }),
  },

  byte: {
    label: 'Byte',
    color: '#16c6ae',
    tap: 'wiggle',
    look: 7,
    mouth: [100, 138],
    cheek: 42,
    eyes: { at: [[75, 120], [125, 120]], r: 11 },
    render: ({ body }) => ({
      defs: '',
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="188" rx="46" ry="6.5" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Cyber Cat Leg: sleek mint thigh, paw with neon pads -->
        <g class="dp-leg-l" style="transform-origin: 74px 144px">
          <!-- Mint feline thigh -->
          <rect x="66" y="144" width="16" height="20" rx="5" fill="${body}"/>
          <circle cx="74" cy="164" r="3" fill="#5effeb" opacity="0.6"/>
          <!-- Robotic kitten paw -->
          <path class="dp-foot-l" d="M60 184 C58 176 66 174 74 174 C82 174 88 176 90 184 Z" fill="#0b7e6f"/>
          <circle cx="66" cy="184" r="2.8" fill="#5effeb"/>
          <circle cx="74" cy="185" r="3" fill="#5effeb"/>
          <circle cx="82" cy="184" r="2.8" fill="#5effeb"/>
        </g>
        <!-- Articulated Right Cyber Cat Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 144px">
          <!-- Mint feline thigh -->
          <rect x="118" y="144" width="16" height="20" rx="5" fill="${body}"/>
          <circle cx="126" cy="164" r="3" fill="#5effeb" opacity="0.6"/>
          <!-- Robotic kitten paw -->
          <path class="dp-foot-r" d="M110 184 C108 176 116 174 124 174 C132 174 138 176 140 184 Z" fill="#0b7e6f"/>
          <circle cx="116" cy="184" r="2.8" fill="#5effeb"/>
          <circle cx="124" cy="185" r="3" fill="#5effeb"/>
          <circle cx="132" cy="184" r="2.8" fill="#5effeb"/>
        </g>
        <!-- Cyber cat tail on side -->
        <g class="dp-tail" style="transform-origin: 164px 144px">
          <path d="M166 144 C188 136 196 114 186 102 C178 94 170 106 174 122 Z" fill="${body}"/>
          <circle cx="186" cy="102" r="4.5" fill="#5effeb"/>
        </g>
        <!-- Chassis torso & cat ears with tech waistband -->
        <g class="dp-torso" fill="${body}">
          <path d="M24 136 L24 116 C24 88 44 70 72 70 L128 70 C156 70 176 88 176 116 L176 136 C170 144 144 146 100 146 C56 146 30 144 24 136 Z"/>
          <path d="M40 84 L34 50 L66 74 Z M160 84 L166 50 L134 74 Z"/>
          <rect x="52" y="138" width="96" height="7" rx="3.5" fill="#0b7e6f"/>
          <!-- Tech chest screen -->
          <rect x="64" y="122" width="72" height="15" rx="3.5" fill="#0b1b1a" opacity="0.6"/>
          <circle cx="76" cy="129.5" r="2.2" fill="#5effeb"/>
          <circle cx="86" cy="129.5" r="2.2" fill="#5effeb" opacity="0.6"/>
          <circle cx="96" cy="129.5" r="2.2" fill="#5effeb" opacity="0.3"/>
        </g>
        <!-- Little arms -->
        <g class="dp-arm-l" style="transform-origin: 26px 130px">
          <ellipse cx="24" cy="136" rx="7" ry="13" transform="rotate(18 24 136)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 174px 130px">
          <ellipse cx="176" cy="136" rx="7" ry="13" transform="rotate(-18 176 136)" fill="${body}"/>
        </g>`,
      accessories: '',
      face: `
        <g class="dp-look">
          <g class="dp-blink"><rect x="66" y="117" width="18" height="18" rx="3" fill="#0b0b12"/><rect x="69" y="120" width="5" height="5" fill="#fff"/></g>
          <g class="dp-blink"><rect x="116" y="117" width="18" height="18" rx="3" fill="#0b0b12"/><rect x="119" y="120" width="5" height="5" fill="#fff"/></g>
        </g>`,
    }),
  },

  ...createPageMascotCharacters(),
};

export { PAGE_MASCOTS };

/**
 * Add (or replace) a character so it can be used as `<dot-pal character="name">`.
 * Existing elements are not re-rendered; set their `character` attribute again.
 */
export function registerCharacter(name, definition) {
  if (!name || typeof definition?.render !== 'function') {
    throw new TypeError('registerCharacter(name, { label, color, render }) requires a render function');
  }
  characters[name] = { label: name, color: '#888888', tap: 'jump', look: 5, mouth: [100, 172], cheek: 36, ...definition };
}
