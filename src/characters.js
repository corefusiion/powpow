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
    mouth: [102, 94],
    cheek: 34,
    eyes: { at: [[86, 74], [118, 74]], r: 10 },
    render: ({ id, body, fur }) => ({
      defs: `
        <radialGradient id="${id('beret')}" gradientUnits="userSpaceOnUse" cx="70" cy="50" r="110">
          <stop offset="0" stop-color="#4a4a4a"/>
          <stop offset=".6" stop-color="#1a1a1a"/>
          <stop offset="1" stop-color="#050505"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="189" rx="46" ry="6.5" fill="#000000" opacity="0.22"/>
        <!-- Articulated Left Leg: Volumetric thigh, knee, and stylish leather boot -->
        <g class="dp-leg-l" style="transform-origin: 74px 122px">
          <!-- Thigh & Knee -->
          <path d="M64 122 C60 132 62 144 66 152 C70 154 80 154 84 152 C88 144 86 132 82 122 Z" fill="${body}"/>
          <circle cx="75" cy="152" r="3.2" fill="#5cb3ff" opacity="0.5"/>
          <!-- Boot cuff & leather artist boot matching beret -->
          <rect x="63" y="156" width="22" height="5.5" rx="2.5" fill="#2d2d34"/>
          <path class="dp-foot-l" d="M58 184 C56 170 64 162 74 162 C84 162 90 170 92 184 C92 186 58 186 58 184 Z" fill="url(#${id('beret')})"/>
          <path d="M58 184 Q75 186.5 92 184" stroke="#000000" stroke-width="2.2" stroke-linecap="round"/>
          <ellipse cx="75" cy="176" rx="7" ry="2.2" fill="#ffffff" opacity="0.25"/>
        </g>
        <!-- Articulated Right Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 122px">
          <!-- Thigh & Knee -->
          <path d="M118 122 C114 132 116 144 120 152 C124 154 134 154 138 152 C142 144 140 132 136 122 Z" fill="${body}"/>
          <circle cx="125" cy="152" r="3.2" fill="#5cb3ff" opacity="0.5"/>
          <!-- Boot cuff & leather boot -->
          <rect x="115" y="156" width="22" height="5.5" rx="2.5" fill="#2d2d34"/>
          <path class="dp-foot-r" d="M108 184 C106 170 114 162 124 162 C134 162 140 170 142 184 C142 186 108 186 108 184 Z" fill="url(#${id('beret')})"/>
          <path d="M108 184 Q125 186.5 142 184" stroke="#000000" stroke-width="2.2" stroke-linecap="round"/>
          <ellipse cx="125" cy="176" rx="7" ry="2.2" fill="#ffffff" opacity="0.25"/>
        </g>
        <!-- Torso with natural chibi waistline and pelvis at y=122 -->
        <path class="dp-torso" fill="${body}" d="M32 94 C24 74 36 56 64 52 C84 48 116 48 136 52 C164 56 176 74 168 94 C162 110 148 122 100 122 C52 122 38 110 32 94 Z"/>
        <!-- Fluffy Arms -->
        <g class="dp-arm-l" style="transform-origin: 32px 90px">
          <ellipse cx="30" cy="98" rx="8" ry="14" transform="rotate(18 30 98)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 168px 90px">
          <ellipse cx="170" cy="98" rx="8" ry="14" transform="rotate(-18 170 98)" fill="${body}"/>
        </g>`,
      accessories: `
        <g filter="${fur}" fill="url(#${id('beret')})">
          <ellipse cx="98" cy="52" rx="84" ry="26" transform="rotate(-6 98 52)"/>
          <ellipse cx="94" cy="38" rx="70" ry="34" transform="rotate(-6 94 38)"/>
          <path d="M80 16 L85 6 L91 16 Z"/>
          <circle cx="85" cy="6" r="10.5"/>
        </g>`,
      face: `
        <g class="dp-look">
          <g class="dp-blink">
            <ellipse cx="86" cy="74" rx="7.5" ry="12" fill="#0b0b12"/>
            <ellipse cx="118" cy="74" rx="7.5" ry="12" fill="#0b0b12"/>
            ${eyeShine(84, 68, 2)}${eyeShine(116, 68, 2)}
          </g>
        </g>`,
    }),
  },

  hop: {
    label: 'Hop',
    color: '#8be22e',
    tap: 'jump',
    look: 8,
    mouth: [100, 88],
    cheek: 52,
    eyes: { at: [[64, 56], [136, 56]], r: 17, own: ['wide'] },
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
        <ellipse class="dp-shadow" cx="100" cy="189" rx="54" ry="7" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Frog Leg: muscular flank thigh, springy knee, 3-toed webbed foot -->
        <g class="dp-leg-l" style="transform-origin: 58px 120px">
          <!-- Muscular bent frog thigh -->
          <path d="M58 120 C36 124 24 136 28 150 C30 158 42 158 50 152 C58 144 62 132 58 120 Z" fill="${body}"/>
          <circle cx="40" cy="148" r="3.5" fill="#b6f74a" opacity="0.6"/>
          <!-- Shin & Ankle -->
          <path d="M44 152 C46 160 50 166 54 172" stroke="${body}" stroke-width="8" stroke-linecap="round"/>
          <!-- Webbed foot with suction toe pads -->
          <path class="dp-foot-l" d="M34 184 C34 172 44 168 54 168 C62 168 72 172 72 184 Z" fill="${body}"/>
          <circle cx="36" cy="184" r="4.5" fill="${body}"/>
          <circle cx="36" cy="184" r="2.2" fill="#b6f74a"/>
          <circle cx="53" cy="185.5" r="4.8" fill="${body}"/>
          <circle cx="53" cy="185.5" r="2.4" fill="#b6f74a"/>
          <circle cx="70" cy="184" r="4.5" fill="${body}"/>
          <circle cx="70" cy="184" r="2.2" fill="#b6f74a"/>
        </g>
        <!-- Articulated Right Frog Leg -->
        <g class="dp-leg-r" style="transform-origin: 142px 120px">
          <!-- Muscular bent frog thigh -->
          <path d="M142 120 C164 124 176 136 172 150 C170 158 158 158 150 152 C142 144 138 132 142 120 Z" fill="${body}"/>
          <circle cx="160" cy="148" r="3.5" fill="#b6f74a" opacity="0.6"/>
          <!-- Shin & Ankle -->
          <path d="M156 152 C154 160 150 166 146 172" stroke="${body}" stroke-width="8" stroke-linecap="round"/>
          <!-- Webbed foot with suction toe pads -->
          <path class="dp-foot-r" d="M128 184 C128 172 138 168 146 168 C156 168 166 172 166 184 Z" fill="${body}"/>
          <circle cx="130" cy="184" r="4.5" fill="#body"/>
          <circle cx="130" cy="184" r="2.2" fill="#b6f74a"/>
          <circle cx="147" cy="185.5" r="4.8" fill="${body}"/>
          <circle cx="147" cy="185.5" r="2.4" fill="#b6f74a"/>
          <circle cx="164" cy="184" r="4.5" fill="${body}"/>
          <circle cx="164" cy="184" r="2.2" fill="#b6f74a"/>
        </g>
        <!-- Frog Torso & Head -->
        <g class="dp-torso" fill="${body}">
          <circle cx="64" cy="56" r="30"/>
          <circle cx="136" cy="56" r="30"/>
          <path d="M30 84 C18 64 36 42 70 42 L130 42 C164 42 182 64 170 84 C162 104 146 122 100 122 C54 122 38 104 30 84 Z"/>
          <ellipse cx="100" cy="98" rx="42" ry="18" fill="url(#${id('belly')})"/>
        </g>
        <!-- Little webbed hands -->
        <g class="dp-arm-l" style="transform-origin: 34px 84px">
          <path d="M30 88 C18 96 20 106 32 104" stroke="${body}" stroke-width="7" stroke-linecap="round" fill="none"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 166px 84px">
          <path d="M170 88 C182 96 180 106 168 104" stroke="${body}" stroke-width="7" stroke-linecap="round" fill="none"/>
        </g>`,
      accessories: '',
      face: [64, 136]
        .map(
          (cx) => `
        <g class="dp-blink">
          <circle cx="${cx}" cy="56" r="22" fill="url(#${id('eyeball')})"/>
          <g class="dp-look">
            <circle cx="${cx}" cy="56" r="12" fill="#0b0b12"/>
            ${eyeShine(cx - 4, 51, 3.2)}
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
    mouth: [100, 92],
    cheek: 36,
    eyes: { at: [[74, 72], [126, 72]], r: 12 },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('belly')}" cx=".5" cy=".5" r=".6">
          <stop offset="0" stop-color="#fff5cc"/>
          <stop offset="1" stop-color="#ffc21a"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="189" rx="48" ry="6.5" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Fox Leg: fluffy thigh, white fur sock, cute paw -->
        <g class="dp-leg-l" style="transform-origin: 74px 120px">
          <!-- Golden Thigh -->
          <path d="M64 120 C60 130 62 142 66 150 C70 152 80 152 84 150 C88 142 86 130 82 120 Z" fill="${body}"/>
          <!-- White fur ankle sock -->
          <rect x="67" y="152" width="14" height="12" rx="4" fill="#fff5cc"/>
          <!-- Fox paw with rounded toes -->
          <path class="dp-foot-l" d="M60 184 C58 172 66 168 74 168 C82 168 88 172 90 184 Z" fill="#f5aa00"/>
          <circle cx="66" cy="184" r="2.8" fill="#ffc21a"/>
          <circle cx="74" cy="185" r="3" fill="#ffc21a"/>
          <circle cx="82" cy="184" r="2.8" fill="#ffc21a"/>
        </g>
        <!-- Articulated Right Fox Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 120px">
          <!-- Golden Thigh -->
          <path d="M118 120 C114 130 116 142 120 150 C124 152 134 152 138 150 C142 142 140 130 136 120 Z" fill="${body}"/>
          <!-- White fur ankle sock -->
          <rect x="119" y="152" width="14" height="12" rx="4" fill="#fff5cc"/>
          <!-- Fox paw with rounded toes -->
          <path class="dp-foot-r" d="M110 184 C108 172 116 168 124 168 C132 168 138 172 140 184 Z" fill="#f5aa00"/>
          <circle cx="116" cy="184" r="2.8" fill="#ffc21a"/>
          <circle cx="124" cy="185" r="3" fill="#ffc21a"/>
          <circle cx="132" cy="184" r="2.8" fill="#ffc21a"/>
        </g>
        <!-- Fluffy Fox Tail on the side -->
        <g class="dp-tail" style="transform-origin: 164px 118px">
          <path d="M164 118 C194 108 204 82 190 70 C178 60 166 74 170 94 Z" fill="${body}"/>
          <path d="M190 70 C184 64 176 70 178 80 C184 78 188 74 190 70 Z" fill="#fff5cc"/>
        </g>
        <!-- Main Body with cream tummy down to y=120 -->
        <path class="dp-torso" fill="${body}" d="M30 94 C26 70 54 28 100 26 C146 28 174 70 170 94 C164 110 144 122 100 122 C56 122 36 110 30 94 Z"/>
        <ellipse cx="100" cy="104" rx="28" ry="14" fill="url(#${id('belly')})"/>
        <!-- Little arms -->
        <g class="dp-arm-l" style="transform-origin: 32px 88px">
          <ellipse cx="30" cy="94" rx="7" ry="13" transform="rotate(20 30 94)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 168px 88px">
          <ellipse cx="170" cy="94" rx="7" ry="13" transform="rotate(-20 170 94)" fill="${body}"/>
        </g>`,
      accessories: '',
      face: `
        <g class="dp-look" fill="none" stroke="#0b0b12" stroke-linecap="round">
          <path class="dp-eyes" stroke-width="4.5" d="M63 73 Q74 83 85 73 M115 73 Q126 83 137 73"/>
          <circle cx="74" cy="71" r="20" stroke-width="5" fill="#fff" fill-opacity=".08"/>
          <circle cx="126" cy="71" r="20" stroke-width="5" fill="#fff" fill-opacity=".08"/>
          <path stroke-width="4.5" d="M97 69 Q100 63 103 69 M51 69 L26 64 M149 69 L174 64"/>
        </g>`,
    }),
  },

  lovi: {
    label: 'Lovi',
    color: '#ff2fc4',
    tap: 'love',
    look: 5,
    mouth: [100, 92],
    cheek: 38,
    eyes: { at: [[76, 70], [124, 70]], r: 11, ink: '#fff' },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('lens')}" cx=".35" cy=".3" r=".8">
          <stop offset="0" stop-color="#3a3a44"/>
          <stop offset=".5" stop-color="#101014"/>
          <stop offset="1" stop-color="#000"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="189" rx="44" ry="6" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Leg: slender stylish thigh, chic obsidian ankle boot -->
        <g class="dp-leg-l" style="transform-origin: 78px 120px">
          <!-- Magenta Thigh & Calf -->
          <rect x="73" y="120" width="11" height="24" rx="5" fill="#d81b99"/>
          <rect x="74" y="142" width="9" height="14" rx="4" fill="#d81b99"/>
          <!-- Designer ankle boot with patent shine -->
          <rect x="71" y="154" width="15" height="4.5" rx="2" fill="#2d2d3a"/>
          <path class="dp-foot-l" d="M64 184 C62 170 70 166 78 166 C86 166 90 170 92 184 Z" fill="#16161f"/>
          <rect x="64" y="184" width="7" height="2" fill="#111116"/>
          <line x1="64" y1="185.5" x2="92" y2="185.5" stroke="#111116" stroke-width="1.5"/>
          <ellipse cx="78" cy="176" rx="6" ry="2" fill="#ffffff" opacity="0.32"/>
        </g>
        <!-- Articulated Right Leg -->
        <g class="dp-leg-r" style="transform-origin: 122px 120px">
          <!-- Magenta Thigh & Calf -->
          <rect x="116" y="120" width="11" height="24" rx="5" fill="#d81b99"/>
          <rect x="117" y="142" width="9" height="14" rx="4" fill="#d81b99"/>
          <!-- Designer ankle boot with patent shine -->
          <rect x="114" y="154" width="15" height="4.5" rx="2" fill="#2d2d3a"/>
          <path class="dp-foot-r" d="M108 184 C106 170 114 166 122 166 C130 166 134 170 136 184 Z" fill="#16161f"/>
          <rect x="108" y="184" width="7" height="2" fill="#111116"/>
          <line x1="108" y1="185.5" x2="136" y2="185.5" stroke="#111116" stroke-width="1.5"/>
          <ellipse cx="122" cy="176" rx="6" ry="2" fill="#ffffff" opacity="0.32"/>
        </g>
        <!-- Heart body completed to waist tip at y=120 -->
        <path class="dp-torso" fill="${body}" d="M100 120 C64 112 22 98 22 68 C22 40 44 26 72 26 C88 26 96 34 100 46 C104 34 112 26 128 26 C156 26 178 40 178 68 C178 98 136 112 100 120 Z"/>
        <!-- Arms -->
        <g class="dp-arm-l" style="transform-origin: 30px 88px">
          <ellipse cx="28" cy="94" rx="6" ry="12" transform="rotate(16 28 94)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 170px 88px">
          <ellipse cx="172" cy="94" rx="6" ry="12" transform="rotate(-16 172 94)" fill="${body}"/>
        </g>`,
      accessories: '',
      face: `
        <g class="dp-look">
          <g stroke="#0b0b12" stroke-width="4.5" stroke-linecap="round" fill="none">
            <path d="M95 66 Q100 60 105 66 M58 64 L18 58 M142 64 L182 58"/>
          </g>
          <circle cx="76" cy="70" r="19" fill="url(#${id('lens')})"/>
          <circle cx="124" cy="70" r="19" fill="url(#${id('lens')})"/>
          <g class="dp-eyes">${eyeShine(69, 63, 3)}${eyeShine(117, 63, 3)}</g>
        </g>`,
    }),
  },

  // -- AI agent pals ---------------------------------------------------------

  muse: {
    label: 'Muse',
    color: '#9d6bff',
    tap: 'spin',
    look: 6,
    mouth: [100, 94],
    cheek: 36,
    eyes: { at: [[80, 74], [120, 74]], r: 11 },
    render: ({ id, body }) => ({
      defs: '',
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="189" rx="46" ry="6.5" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Leg: lavender thigh, royal violet fantasy boot with gold buckle -->
        <g class="dp-leg-l" style="transform-origin: 76px 120px">
          <!-- Thigh & Knee -->
          <rect x="70" y="120" width="14" height="24" rx="5" fill="${body}"/>
          <circle cx="77" cy="144" r="3" fill="#c3a2ff" opacity="0.6"/>
          <!-- Boot cuff & gold star buckle -->
          <rect x="67" y="152" width="19" height="5.5" rx="2.5" fill="#5c2cb8"/>
          <circle cx="76" cy="154.5" r="2.5" fill="#fff3a6"/>
          <!-- Curled fantasy boot -->
          <path class="dp-foot-l" d="M60 184 C58 170 66 164 76 164 C86 164 92 170 94 184 Z" fill="#753cd8"/>
          <path d="M60 184 Q77 186.5 94 184" stroke="#481e96" stroke-width="2"/>
          <circle cx="86" cy="178" r="1.5" fill="#fff3a6" opacity="0.9"/>
        </g>
        <!-- Articulated Right Leg -->
        <g class="dp-leg-r" style="transform-origin: 124px 120px">
          <!-- Thigh & Knee -->
          <rect x="116" y="120" width="14" height="24" rx="5" fill="${body}"/>
          <circle cx="123" cy="144" r="3" fill="#c3a2ff" opacity="0.6"/>
          <!-- Boot cuff & gold buckle -->
          <rect x="114" y="152" width="19" height="5.5" rx="2.5" fill="#5c2cb8"/>
          <circle cx="124" cy="154.5" r="2.5" fill="#fff3a6"/>
          <!-- Curled fantasy boot -->
          <path class="dp-foot-r" d="M106 184 C104 170 114 164 124 164 C134 164 140 170 142 184 Z" fill="#753cd8"/>
          <path d="M106 184 Q123 186.5 142 184" stroke="#481e96" stroke-width="2"/>
          <circle cx="134" cy="178" r="1.5" fill="#fff3a6" opacity="0.9"/>
        </g>
        <!-- Torso with celestial curve down to y=120 -->
        <path class="dp-torso" fill="${body}" d="M30 94 C26 70 54 48 94 36 C88 24 100 12 118 16 C106 22 106 34 120 38 C158 48 174 70 170 94 C164 110 144 122 100 122 C56 122 36 110 30 94 Z"/>
        <path d="M46 116 Q100 124 154 116" stroke="#753cd8" stroke-width="4" stroke-linecap="round" fill="none"/>
        <!-- Celestial arms -->
        <g class="dp-arm-l" style="transform-origin: 28px 88px">
          <ellipse cx="26" cy="94" rx="7" ry="14" transform="rotate(18 26 94)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 172px 88px">
          <ellipse cx="174" cy="94" rx="7" ry="14" transform="rotate(-18 174 94)" fill="${body}"/>
        </g>`,
      accessories: `
        <path class="dp-sparkle" fill="#fff3a6" d="M156 16 Q159 30 172 33 Q159 36 156 50 Q153 36 140 33 Q153 30 156 16 Z"/>
        <path fill="#fff3a6" opacity=".8" d="M40 44 Q41.5 50 48 51.5 Q41.5 53 40 59 Q38.5 53 32 51.5 Q38.5 50 40 44 Z"/>`,
      face: `
        <g class="dp-look">
          ${[80, 120]
            .map(
              (cx, i) => `
            <g class="dp-blink">
              <ellipse cx="${cx}" cy="74" rx="8.5" ry="12" fill="#0b0b12"/>
              <path d="M${cx + (i ? 7 : -7)} 68 l${i ? 6 : -6} -5" stroke="#0b0b12" stroke-width="3.5" stroke-linecap="round"/>
              ${eyeShine(cx - 2.5, 68, 2.6)}
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
    mouth: [100, 94],
    cheek: 46,
    eyes: { at: [[76.5, 72], [123.5, 72]], r: 12, ink: '#dff4ff', glow: true },
    render: ({ id, body }) => ({
      defs: `
        <filter id="${id('glow')}" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="189" rx="50" ry="7" fill="#000000" opacity="0.25"/>
        <!-- Articulated Left Robotic Leg: ball-joint hip, armored thigh, knee servo, magnetic glowing boot -->
        <g class="dp-leg-l" style="transform-origin: 72px 120px">
          <!-- Ball joint socket -->
          <circle cx="72" cy="120" r="7" fill="#181c24" stroke="#00d4ff" stroke-width="1.5"/>
          <!-- Armored thigh & power conduit -->
          <rect x="64" y="122" width="16" height="24" rx="3" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <line x1="72" y1="124" x2="72" y2="142" stroke="#00d4ff" stroke-width="2" opacity="0.8"/>
          <!-- Articulated knee servo -->
          <rect x="66" y="146" width="12" height="6" rx="2" fill="#181c24" stroke="#00d4ff" stroke-width="1.2"/>
          <!-- Shin guard -->
          <path d="M64 154 L80 154 L78 170 L66 170 Z" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <!-- Magnetized boot with glowing tread -->
          <path class="dp-foot-l" d="M56 184 L64 170 L82 170 L88 184 L88 186 L56 186 Z" fill="#181c24" stroke="#2d3340" stroke-width="1.5"/>
          <rect x="58" y="184" width="28" height="2.5" rx="1" fill="#00d4ff" filter="url(#${id('glow')})"/>
        </g>
        <!-- Articulated Right Robotic Leg -->
        <g class="dp-leg-r" style="transform-origin: 128px 120px">
          <!-- Ball joint socket -->
          <circle cx="128" cy="120" r="7" fill="#181c24" stroke="#00d4ff" stroke-width="1.5"/>
          <!-- Armored thigh & power conduit -->
          <rect x="120" y="122" width="16" height="24" rx="3" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <line x1="128" y1="124" x2="128" y2="142" stroke="#00d4ff" stroke-width="2" opacity="0.8"/>
          <!-- Knee servo -->
          <rect x="122" y="146" width="12" height="6" rx="2" fill="#181c24" stroke="#00d4ff" stroke-width="1.2"/>
          <!-- Shin guard -->
          <path d="M120 154 L136 154 L134 170 L122 170 Z" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <!-- Magnetized boot with glowing tread -->
          <path class="dp-foot-r" d="M112 184 L120 170 L138 170 L144 184 L144 186 L112 186 Z" fill="#181c24" stroke="#2d3340" stroke-width="1.5"/>
          <rect x="114" y="184" width="28" height="2.5" rx="1" fill="#00d4ff" filter="url(#${id('glow')})"/>
        </g>
        <!-- Robotic chassis body with utility belt -->
        <g class="dp-torso">
          <path fill="${body}" d="M30 68 C30 46 46 32 72 32 L128 32 C154 32 170 46 170 68 L170 118 L30 118 Z"/>
          <rect x="36" y="112" width="128" height="10" rx="3" fill="#1b202a" stroke="#2d3442" stroke-width="1.5"/>
          <rect x="92" y="110" width="16" height="14" rx="2" fill="#00d4ff" opacity="0.85"/>
        </g>
        <!-- Robotic clamp arms -->
        <g class="dp-arm-l" style="transform-origin: 22px 82px">
          <rect x="16" y="80" width="10" height="30" rx="5" fill="#2d3340"/>
          <circle cx="21" cy="112" r="5" fill="#00d4ff" opacity="0.8"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 178px 82px">
          <rect x="174" y="80" width="10" height="30" rx="5" fill="#2d3340"/>
          <circle cx="179" cy="112" r="5" fill="#00d4ff" opacity="0.8"/>
        </g>`,
      accessories: `
        <rect x="32" y="56" width="136" height="44" rx="22" fill="#0d1117" stroke="#252c38" stroke-width="3"/>
        <path d="M140 26 L118 50" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`,
      face: `
        <g class="dp-look" filter="url(#${id('glow')})" fill="#dff4ff">
          <g class="dp-blink"><rect x="68" y="65" width="17" height="26" rx="8.5"/></g>
          <g class="dp-blink"><rect x="115" y="65" width="17" height="26" rx="8.5"/></g>
        </g>`,
    }),
  },

  nova: {
    label: 'Nova',
    color: '#ff7a2f',
    tap: 'jump',
    look: 7,
    mouth: [100, 94],
    cheek: 40,
    eyes: { at: [[78, 74], [122, 74]], r: 11 },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('bulb')}" cx=".4" cy=".35" r=".7">
          <stop offset="0" stop-color="#fffbe6"/>
          <stop offset=".6" stop-color="#ffe066"/>
          <stop offset="1" stop-color="#ffb000"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="189" rx="46" ry="6.5" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Leg: sporty pants, articulated knee, stylish high-top sneaker -->
        <g class="dp-leg-l" style="transform-origin: 74px 120px">
          <!-- Athletic pants thigh & calf -->
          <rect x="66" y="120" width="16" height="26" rx="5" fill="#c44300"/>
          <rect x="68" y="144" width="13" height="16" rx="4" fill="#c44300"/>
          <!-- High-top sneaker with racing stripe and rubber toe -->
          <path class="dp-foot-l" d="M58 184 C56 170 64 164 74 164 C84 164 90 170 92 184 Z" fill="#ffffff" stroke="#c44300" stroke-width="1.8"/>
          <path d="M64 176 Q74 170 84 176" stroke="#ff7a2f" stroke-width="2.5" fill="none"/>
          <path d="M86 176 C89 178 92 181 92 184 L86 184 Z" fill="#eeeeee"/>
          <rect x="57" y="183.5" width="36" height="3" rx="1.5" fill="#dddddd" stroke="#999999" stroke-width="0.8"/>
        </g>
        <!-- Articulated Right Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 120px">
          <!-- Athletic pants thigh & calf -->
          <rect x="118" y="120" width="16" height="26" rx="5" fill="#c44300"/>
          <rect x="119" y="144" width="13" height="16" rx="4" fill="#c44300"/>
          <!-- High-top sneaker -->
          <path class="dp-foot-r" d="M108 184 C106 170 114 164 124 164 C134 164 140 170 142 184 Z" fill="#ffffff" stroke="#c44300" stroke-width="1.8"/>
          <path d="M114 176 Q124 170 134 176" stroke="#ff7a2f" stroke-width="2.5" fill="none"/>
          <path d="M136 176 C139 178 142 181 142 184 L136 184 Z" fill="#eeeeee"/>
          <rect x="107" y="183.5" width="36" height="3" rx="1.5" fill="#dddddd" stroke="#999999" stroke-width="0.8"/>
        </g>
        <!-- Torso with hoodie waistband at y=120 -->
        <path class="dp-torso" fill="${body}" d="M30 94 C26 68 56 46 100 46 C144 46 174 68 170 94 C164 110 144 122 100 122 C56 122 36 110 30 94 Z"/>
        <rect x="44" y="116" width="112" height="7" rx="3.5" fill="#e05a10"/>
        <!-- Cute arms -->
        <g class="dp-arm-l" style="transform-origin: 26px 88px">
          <ellipse cx="24" cy="94" rx="8" ry="14" transform="rotate(18 24 94)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 174px 88px">
          <ellipse cx="176" cy="94" rx="8" ry="14" transform="rotate(-18 176 94)" fill="${body}"/>
        </g>`,
      accessories: `
        <path d="M100 50 C100 38 104 28 100 18" stroke="#2a2a33" stroke-width="5" stroke-linecap="round" fill="none"/>
        <circle class="dp-bulb" cx="100" cy="14" r="10" fill="url(#${id('bulb')})"/>`,
      face: `
        <g class="dp-look">
          <g class="dp-blink"><circle cx="78" cy="74" r="10.5" fill="#0b0b12"/>${eyeShine(75, 70, 3)}</g>
          <g class="dp-blink"><circle cx="122" cy="74" r="10.5" fill="#0b0b12"/>${eyeShine(119, 70, 3)}</g>
        </g>`,
    }),
  },

  embasa: {
    label: 'Embasa (Gota)',
    color: '#0495f4',
    fur: false,
    tap: 'jump',
    look: 8,
    mouth: [100, 94],
    cheek: 40,
    eyes: { at: [[76, 68], [124, 68]], r: 15, own: ['wide'] },
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
        <ellipse class="dp-shadow" cx="100" cy="189" rx="48" ry="6.5" fill="#000000" opacity="0.22"/>
        <!-- Articulated Left Water Leg: Volumetric 3D thigh, distinct knee, calf and water sneaker -->
        <g class="dp-leg-l" style="transform-origin: 74px 124px">
          <!-- 3D Liquid Thigh -->
          <path d="M62 124 C58 134 60 146 66 154 C72 156 82 156 86 154 C90 146 88 134 84 124 Z" fill="url(#${id('drop_body')})" stroke="#022e6b" stroke-width="1.2"/>
          <ellipse cx="73" cy="138" rx="3" ry="8" transform="rotate(-8 73 138)" fill="#ffffff" opacity="0.45"/>
          <!-- Articulated Knee Joint -->
          <circle cx="75" cy="154" r="4.2" fill="#34c2fb" stroke="#022e6b" stroke-width="1.1"/>
          <circle cx="74" cy="153" r="1.6" fill="#ffffff" opacity="0.9"/>
          <!-- Calf & Shin -->
          <path d="M66 154 C65 160 67 166 69 170 L81 170 C83 166 84 160 83 154 Z" fill="url(#${id('limb_grad')})" stroke="#022e6b" stroke-width="1.1"/>
          <!-- Sneaker Ankle Cuff -->
          <rect x="66" y="167" width="17" height="4.5" rx="2" fill="#ffffff" stroke="#022e6b" stroke-width="1"/>
          <!-- 3D Water Droplet Sneaker -->
          <path class="dp-foot-l" d="M54 184 C52 174 62 168 75 168 C86 168 93 173 94 184 Z" fill="url(#${id('foot_grad')})" stroke="#022e6b" stroke-width="1.2"/>
          <path d="M86 174 C90 176 93 180 94 184 L86 184 Z" fill="#ffffff"/>
          <rect x="52" y="183.5" width="44" height="4" rx="2" fill="#ffffff" stroke="#012b6b" stroke-width="1.2"/>
          <line x1="56" y1="187.5" x2="92" y2="187.5" stroke="#38bdf8" stroke-width="1.2"/>
          <ellipse cx="73" cy="176" rx="8" ry="3" fill="#ffffff" opacity="0.55"/>
          <circle cx="76" cy="173" r="1.2" fill="#ffffff"/>
        </g>
        <!-- Articulated Right Water Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 124px">
          <!-- 3D Liquid Thigh -->
          <path d="M116 124 C112 134 114 146 118 154 C124 156 134 156 138 154 C142 146 144 134 138 124 Z" fill="url(#${id('drop_body')})" stroke="#022e6b" stroke-width="1.2"/>
          <ellipse cx="127" cy="138" rx="3" ry="8" transform="rotate(8 127 138)" fill="#ffffff" opacity="0.45"/>
          <!-- Articulated Knee Joint -->
          <circle cx="125" cy="154" r="4.2" fill="#34c2fb" stroke="#022e6b" stroke-width="1.1"/>
          <circle cx="126" cy="153" r="1.6" fill="#ffffff" opacity="0.9"/>
          <!-- Calf & Shin -->
          <path d="M117 154 C116 160 118 166 120 170 L132 170 C134 166 135 160 134 154 Z" fill="url(#${id('limb_grad')})" stroke="#022e6b" stroke-width="1.1"/>
          <!-- Sneaker Ankle Cuff -->
          <rect x="117" y="167" width="17" height="4.5" rx="2" fill="#ffffff" stroke="#022e6b" stroke-width="1"/>
          <!-- 3D Water Droplet Sneaker -->
          <path class="dp-foot-r" d="M106 184 C104 174 114 168 127 168 C138 168 145 173 146 184 Z" fill="url(#${id('foot_grad')})" stroke="#022e6b" stroke-width="1.2"/>
          <path d="M138 174 C142 176 145 180 146 184 L138 184 Z" fill="#ffffff"/>
          <rect x="104" y="183.5" width="44" height="4" rx="2" fill="#ffffff" stroke="#012b6b" stroke-width="1.2"/>
          <line x1="108" y1="187.5" x2="144" y2="187.5" stroke="#38bdf8" stroke-width="1.2"/>
          <ellipse cx="127" cy="176" rx="8" ry="3" fill="#ffffff" opacity="0.55"/>
          <circle cx="124" cy="173" r="1.2" fill="#ffffff"/>
        </g>
        <!-- Fluid Ribbon back pass -->
        <path fill="none" stroke="url(#${id('ribbon_grad')})" stroke-width="9" stroke-linecap="round" opacity="0.7"
          d="M38 108 C20 116 26 124 48 126 C76 128 124 128 152 124 C174 120 178 114 162 106"/>
        <!-- Main 3D Water Droplet Body tapering to waist at y=112 and pelvis at y=122 -->
        <g class="dp-torso">
          <path fill="url(#${id('drop_body')})" stroke="#022e6b" stroke-width="1.3"
            d="M100 14 C94 36 48 64 44 88 C40 102 48 112 64 116 C76 119 124 119 136 116 C152 112 160 102 156 88 C152 64 106 36 100 14 Z"/>
          <!-- Specular 3D Glossy Light Reflection -->
          <path fill="#ffffff" opacity="0.45"
            d="M100 18 C96 36 54 64 50 86 C48 96 56 106 66 108 C54 104 50 94 52 84 C56 62 94 30 100 18 Z"/>
          <ellipse cx="80" cy="46" rx="6" ry="14" transform="rotate(-30 80 46)" fill="#ffffff" opacity="0.65"/>
          <circle cx="79" cy="42" r="2.8" fill="#ffffff" opacity="0.95"/>
          <!-- Lower right bounce light reflection -->
          <path fill="#38bdf8" opacity="0.32" d="M136 88 C144 98 142 108 132 112 C138 108 142 98 136 88 Z"/>
          <!-- Pelvic base connecting naturally to legs -->
          <path fill="url(#${id('drop_body')})" stroke="#022e6b" stroke-width="1.2"
            d="M64 116 C62 124 68 128 78 130 C90 132 110 132 122 130 C132 128 138 124 136 116 Z"/>
        </g>
        <!-- Left Arm -->
        <g class="dp-arm-l" style="transform-origin: 42px 92px" fill="url(#${id('limb_grad')})">
          <path d="M44 88 C28 92 18 104 22 116 C24 122 32 122 38 114 C44 106 48 98 48 88 Z"/>
          <circle cx="24" cy="114" r="6"/>
          <circle cx="22" cy="110" r="3" fill="#8ae0ff"/>
        </g>
        <!-- Right Arm (Friendly waving greeting) -->
        <g class="dp-arm-r" style="transform-origin: 158px 92px" fill="url(#${id('limb_grad')})">
          <path d="M156 88 C170 82 182 72 184 60 C184 54 174 54 170 62 C164 72 158 82 150 88 Z"/>
          <circle cx="182" cy="58" r="6"/>
          <circle cx="186" cy="52" r="3.2"/>
          <circle cx="180" cy="56" r="2.8" fill="#8ae0ff"/>
        </g>
      `,
      accessories: `
        <!-- Signature Embasa Fluid Ribbon (front swirl around waist) -->
        <path fill="none" stroke="url(#${id('ribbon_grad')})" stroke-width="11" stroke-linecap="round"
          d="M36 106 C64 118 136 118 164 106"/>
        <path fill="none" stroke="#6dc152" stroke-width="2.6" stroke-linecap="round" opacity="0.92"
          d="M42 110 C66 120 134 120 158 110"/>
        <!-- Ambient Water Droplets & Splashes -->
        <circle cx="34" cy="48" r="4.2" fill="#38bdf8" opacity="0.85"/>
        <circle cx="33" cy="46" r="1.6" fill="#ffffff" opacity="0.95"/>
        <circle cx="166" cy="52" r="4.5" fill="#38bdf8" opacity="0.85"/>
        <circle cx="164.5" cy="50" r="1.8" fill="#ffffff" opacity="0.95"/>
        <circle cx="174" cy="108" r="3.2" fill="#6dc152" opacity="0.75"/>
        <circle cx="28" cy="98" r="3" fill="#1fbcf0" opacity="0.75"/>
      `,
      face: `
        <!-- Cheerful Eyebrows -->
        <g fill="none" stroke="#0454b0" stroke-width="3.5" stroke-linecap="round">
          <path d="M64 48 Q76 41 88 48"/>
          <path d="M112 48 Q124 41 136 48"/>
        </g>
        <!-- Big Expressive Pixar Eyes (Follows cursor smoothly!) -->
        <g class="dp-blink">
          <!-- Left Eye Sclera (White) -->
          <ellipse cx="76" cy="68" rx="14" ry="17" fill="url(#${id('drop_sclera')})" stroke="#02285a" stroke-width="1.3"/>
          <!-- Left Eye Pupil & Iris (Tracks Mouse Cursor) -->
          <g class="dp-look">
            <ellipse cx="76.5" cy="68" rx="9.5" ry="12.5" fill="#021432"/>
            <path d="M69 71 A8.5 9.5 0 0 0 84 71 A7.5 8.5 0 0 1 71 69 Z" fill="#0495f4"/>
            <ellipse cx="77.5" cy="72" rx="5" ry="3.5" fill="#38bdf8" opacity="0.85"/>
            ${eyeShine(72.5, 62.5, 3.8)}
            ${eyeShine(80.5, 73.5, 1.8)}
          </g>
        </g>
        <g class="dp-blink">
          <!-- Right Eye Sclera (White) -->
          <ellipse cx="124" cy="68" rx="14" ry="17" fill="url(#${id('drop_sclera')})" stroke="#02285a" stroke-width="1.3"/>
          <!-- Right Eye Pupil & Iris (Tracks Mouse Cursor) -->
          <g class="dp-look">
            <ellipse cx="123.5" cy="68" rx="9.5" ry="12.5" fill="#021432"/>
            <path d="M116 71 A8.5 9.5 0 0 0 131 71 A7.5 8.5 0 0 1 118 69 Z" fill="#0495f4"/>
            <ellipse cx="122.5" cy="72" rx="5" ry="3.5" fill="#38bdf8" opacity="0.85"/>
            ${eyeShine(119.5, 62.5, 3.8)}
            ${eyeShine(127.5, 73.5, 1.8)}
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
    mouth: [100, 94],
    cheek: 42,
    eyes: { at: [[75, 72], [125, 72]], r: 11 },
    render: ({ body }) => ({
      defs: '',
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="189" rx="46" ry="6.5" fill="#000000" opacity="0.2"/>
        <!-- Articulated Left Cyber Cat Leg: sleek mint thigh, paw with neon pads -->
        <g class="dp-leg-l" style="transform-origin: 74px 120px">
          <!-- Mint feline thigh -->
          <rect x="66" y="120" width="16" height="26" rx="5" fill="${body}"/>
          <circle cx="74" cy="144" r="3" fill="#5effeb" opacity="0.6"/>
          <!-- Robotic kitten paw -->
          <path class="dp-foot-l" d="M60 184 C58 170 66 166 74 166 C82 166 88 170 90 184 Z" fill="#0b7e6f"/>
          <circle cx="66" cy="184" r="2.8" fill="#5effeb"/>
          <circle cx="74" cy="185" r="3" fill="#5effeb"/>
          <circle cx="82" cy="184" r="2.8" fill="#5effeb"/>
        </g>
        <!-- Articulated Right Cyber Cat Leg -->
        <g class="dp-leg-r" style="transform-origin: 126px 120px">
          <!-- Mint feline thigh -->
          <rect x="118" y="120" width="16" height="26" rx="5" fill="${body}"/>
          <circle cx="126" cy="144" r="3" fill="#5effeb" opacity="0.6"/>
          <!-- Robotic kitten paw -->
          <path class="dp-foot-r" d="M110 184 C108 170 116 166 124 166 C132 166 138 170 140 184 Z" fill="#0b7e6f"/>
          <circle cx="116" cy="184" r="2.8" fill="#5effeb"/>
          <circle cx="124" cy="185" r="3" fill="#5effeb"/>
          <circle cx="132" cy="184" r="2.8" fill="#5effeb"/>
        </g>
        <!-- Cyber cat tail on side -->
        <g class="dp-tail" style="transform-origin: 164px 118px">
          <path d="M166 118 C188 110 196 88 186 76 C178 68 170 80 174 96 Z" fill="${body}"/>
          <circle cx="186" cy="76" r="4.5" fill="#5effeb"/>
        </g>
        <!-- Chassis torso & cat ears with tech waistband down to y=120 -->
        <g class="dp-torso" fill="${body}">
          <path d="M30 94 L30 74 C30 46 50 28 78 28 L122 28 C150 28 170 46 170 74 L170 94 C164 110 144 122 100 122 C56 122 36 110 30 94 Z"/>
          <path d="M46 42 L40 8 L72 32 Z M154 42 L160 8 L128 32 Z"/>
          <rect x="52" y="116" width="96" height="7" rx="3.5" fill="#0b7e6f"/>
          <!-- Tech chest screen -->
          <rect x="64" y="100" width="72" height="15" rx="3.5" fill="#0b1b1a" opacity="0.6"/>
          <circle cx="76" cy="107.5" r="2.2" fill="#5effeb"/>
          <circle cx="86" cy="107.5" r="2.2" fill="#5effeb" opacity="0.6"/>
          <circle cx="96" cy="107.5" r="2.2" fill="#5effeb" opacity="0.3"/>
        </g>
        <!-- Little arms -->
        <g class="dp-arm-l" style="transform-origin: 26px 88px">
          <ellipse cx="24" cy="94" rx="7" ry="13" transform="rotate(18 24 94)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 174px 88px">
          <ellipse cx="176" cy="94" rx="7" ry="13" transform="rotate(-18 176 94)" fill="${body}"/>
        </g>`,
      accessories: '',
      face: `
        <g class="dp-look">
          <g class="dp-blink"><rect x="66" y="69" width="18" height="18" rx="3" fill="#0b0b12"/><rect x="69" y="72" width="5" height="5" fill="#fff"/></g>
          <g class="dp-blink"><rect x="116" y="69" width="18" height="18" rx="3" fill="#0b0b12"/><rect x="119" y="72" width="5" height="5" fill="#fff"/></g>
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
