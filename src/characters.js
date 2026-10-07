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
    mouth: [102, 168],
    cheek: 34,
    eyes: { at: [[86, 146], [118, 146]], r: 10 },
    render: ({ id, body, fur }) => ({
      defs: `
        <radialGradient id="${id('beret')}" gradientUnits="userSpaceOnUse" cx="70" cy="50" r="110">
          <stop offset="0" stop-color="#4a4a4a"/>
          <stop offset=".6" stop-color="#1a1a1a"/>
          <stop offset="1" stop-color="#050505"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="102" cy="192" rx="44" ry="6.5" fill="#000000" opacity="0.18"/>
        <!-- Left Leg & Shoe (matching beret dark graphite leather) -->
        <g class="dp-leg-l" style="transform-origin: 76px 168px">
          <rect x="70" y="164" width="12" height="22" rx="6" fill="${body}"/>
          <ellipse class="dp-foot-l" cx="74" cy="186" rx="14" ry="6.5" fill="url(#${id('beret')})"/>
          <ellipse cx="72" cy="184" rx="7" ry="2.5" fill="#ffffff" opacity="0.25"/>
        </g>
        <!-- Right Leg & Shoe -->
        <g class="dp-leg-r" style="transform-origin: 126px 168px">
          <rect x="120" y="164" width="12" height="22" rx="6" fill="${body}"/>
          <ellipse class="dp-foot-r" cx="128" cy="186" rx="14" ry="6.5" fill="url(#${id('beret')})"/>
          <ellipse cx="126" cy="184" rx="7" ry="2.5" fill="#ffffff" opacity="0.25"/>
        </g>
        <!-- Full Torso with continuous organic curves and natural hips -->
        <path class="dp-torso" fill="${body}" d="M18 170 C16 150 8 132 34 128 C30 104 56 88 82 96
          C94 78 132 76 146 96 C172 92 196 114 186 142 C202 154 196 170 184 172
          C170 176 144 178 102 178 C60 178 28 176 18 170 Z"/>
        <!-- Fluffy Arms -->
        <g class="dp-arm-l" style="transform-origin: 26px 140px">
          <ellipse cx="24" cy="148" rx="9" ry="15" transform="rotate(18 24 148)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 176px 140px">
          <ellipse cx="178" cy="148" rx="9" ry="15" transform="rotate(-18 178 148)" fill="${body}"/>
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
            <ellipse cx="86" cy="146" rx="7.5" ry="12" fill="#0b0b12"/>
            <ellipse cx="118" cy="146" rx="7.5" ry="12" fill="#0b0b12"/>
            ${eyeShine(84, 140, 2)}${eyeShine(116, 140, 2)}
          </g>
        </g>`,
    }),
  },

  hop: {
    label: 'Hop',
    color: '#8be22e',
    tap: 'jump',
    look: 8,
    mouth: [100, 138],
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
        <ellipse class="dp-shadow" cx="100" cy="192" rx="52" ry="6.5" fill="#000000" opacity="0.18"/>
        <!-- Frog bent legs and webbed feet -->
        <g class="dp-leg-l" style="transform-origin: 52px 166px">
          <path d="M42 162 C28 170 30 182 50 184 C60 185 64 176 56 168 Z" fill="${body}"/>
          <ellipse class="dp-foot-l" cx="48" cy="186" rx="15" ry="5.5" fill="${body}"/>
          <circle cx="38" cy="186" r="3" fill="#a2f038"/>
          <circle cx="48" cy="188" r="3" fill="#a2f038"/>
          <circle cx="58" cy="186" r="3" fill="#a2f038"/>
        </g>
        <g class="dp-leg-r" style="transform-origin: 148px 166px">
          <path d="M158 162 C172 170 170 182 150 184 C140 185 136 176 144 168 Z" fill="${body}"/>
          <ellipse class="dp-foot-r" cx="152" cy="186" rx="15" ry="5.5" fill="${body}"/>
          <circle cx="142" cy="186" r="3" fill="#a2f038"/>
          <circle cx="152" cy="188" r="3" fill="#a2f038"/>
          <circle cx="162" cy="186" r="3" fill="#a2f038"/>
        </g>
        <!-- Torso & Head -->
        <g class="dp-torso" fill="${body}">
          <path d="M20 170 C16 130 52 110 100 110 C148 110 184 130 180 170 C176 178 144 180 100 180 C56 180 24 178 20 170 Z"/>
          <ellipse cx="100" cy="156" rx="36" ry="18" fill="url(#${id('belly')})"/>
          <circle cx="64" cy="96" r="34"/>
          <circle cx="136" cy="96" r="34"/>
        </g>
        <!-- Cute frog arms -->
        <g class="dp-arm-l" style="transform-origin: 32px 146px">
          <path d="M30 144 C18 152 20 162 32 160" stroke="${body}" stroke-width="7" stroke-linecap="round" fill="none"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 168px 146px">
          <path d="M170 144 C182 152 180 162 168 160" stroke="${body}" stroke-width="7" stroke-linecap="round" fill="none"/>
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
    mouth: [100, 160],
    cheek: 36,
    eyes: { at: [[74, 130], [126, 130]], r: 12 },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('belly')}" cx=".5" cy=".5" r=".6">
          <stop offset="0" stop-color="#fff5cc"/>
          <stop offset="1" stop-color="#ffc21a"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="192" rx="46" ry="6.5" fill="#000000" opacity="0.18"/>
        <!-- Fluffy fox paws / legs -->
        <g class="dp-leg-l" style="transform-origin: 74px 168px">
          <rect x="68" y="164" width="12" height="22" rx="6" fill="${body}"/>
          <ellipse class="dp-foot-l" cx="72" cy="186" rx="12" ry="6" fill="#f5aa00"/>
        </g>
        <g class="dp-leg-r" style="transform-origin: 126px 168px">
          <rect x="120" y="164" width="12" height="22" rx="6" fill="${body}"/>
          <ellipse class="dp-foot-r" cx="128" cy="186" rx="12" ry="6" fill="#f5aa00"/>
        </g>
        <!-- Fluffy tail on the side -->
        <g class="dp-tail" style="transform-origin: 160px 168px">
          <path d="M164 168 C188 160 196 138 184 126 C176 118 166 128 170 144 Z" fill="${body}"/>
          <path d="M184 126 C180 122 172 126 174 134 C178 132 182 128 184 126 Z" fill="#fff5cc"/>
        </g>
        <!-- Main body with cream tummy -->
        <path class="dp-torso" fill="${body}" d="M14 170 C16 116 58 36 100 34 C142 36 184 116 186 170 C178 178 144 180 100 180 C56 180 22 178 14 170 Z"/>
        <ellipse cx="100" cy="158" rx="28" ry="16" fill="url(#${id('belly')})"/>
        <!-- Little arms -->
        <g class="dp-arm-l" style="transform-origin: 32px 140px">
          <ellipse cx="30" cy="148" rx="7" ry="13" transform="rotate(20 30 148)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 168px 140px">
          <ellipse cx="170" cy="148" rx="7" ry="13" transform="rotate(-20 170 148)" fill="${body}"/>
        </g>`,
      accessories: '',
      face: `
        <g class="dp-look" fill="none" stroke="#0b0b12" stroke-linecap="round">
          <path class="dp-eyes" stroke-width="4.5" d="M63 131 Q74 141 85 131 M115 131 Q126 141 137 131"/>
          <circle cx="74" cy="129" r="22" stroke-width="5.5" fill="#fff" fill-opacity=".08"/>
          <circle cx="126" cy="129" r="22" stroke-width="5.5" fill="#fff" fill-opacity=".08"/>
          <path stroke-width="5" d="M97 125 Q100 119 103 125 M51 125 L26 120 M149 125 L174 120"/>
        </g>`,
    }),
  },

  lovi: {
    label: 'Lovi',
    color: '#ff2fc4',
    tap: 'love',
    look: 5,
    mouth: [100, 156],
    cheek: 38,
    eyes: { at: [[76, 124], [124, 124]], r: 11, ink: '#fff' },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('lens')}" cx=".35" cy=".3" r=".8">
          <stop offset="0" stop-color="#3a3a44"/>
          <stop offset=".5" stop-color="#101014"/>
          <stop offset="1" stop-color="#000"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="192" rx="42" ry="6" fill="#000000" opacity="0.18"/>
        <!-- Slender stylish legs with chic black ankle boots -->
        <g class="dp-leg-l" style="transform-origin: 80px 166px">
          <rect x="76" y="162" width="8" height="24" rx="4" fill="#d81b99"/>
          <ellipse class="dp-foot-l" cx="78" cy="186" rx="11" ry="5.5" fill="#16161f"/>
          <ellipse cx="76" cy="184" rx="5" ry="2" fill="#ffffff" opacity="0.3"/>
        </g>
        <g class="dp-leg-r" style="transform-origin: 120px 166px">
          <rect x="116" y="162" width="8" height="24" rx="4" fill="#d81b99"/>
          <ellipse class="dp-foot-r" cx="122" cy="186" rx="11" ry="5.5" fill="#16161f"/>
          <ellipse cx="120" cy="184" rx="5" ry="2" fill="#ffffff" opacity="0.3"/>
        </g>
        <!-- Heart body completed to lower tip -->
        <path class="dp-torso" fill="${body}" d="M100 172 C64 156 12 142 12 96 C12 58 38 42 70 42 C86 42 96 50 100 62
          C104 50 114 42 130 42 C162 42 188 58 188 96 C188 142 136 156 100 172 Z"/>
        <!-- Arms -->
        <g class="dp-arm-l" style="transform-origin: 28px 120px">
          <ellipse cx="26" cy="128" rx="6" ry="12" transform="rotate(16 26 128)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 172px 120px">
          <ellipse cx="174" cy="128" rx="6" ry="12" transform="rotate(-16 174 128)" fill="${body}"/>
        </g>`,
      accessories: '',
      face: `
        <g class="dp-look">
          <g stroke="#0b0b12" stroke-width="4.5" stroke-linecap="round" fill="none">
            <path d="M95 120 Q100 114 105 120 M58 118 L18 112 M142 118 L182 112"/>
          </g>
          <circle cx="76" cy="124" r="19" fill="url(#${id('lens')})"/>
          <circle cx="124" cy="124" r="19" fill="url(#${id('lens')})"/>
          <g class="dp-eyes">${eyeShine(69, 117, 3)}${eyeShine(117, 117, 3)}</g>
        </g>`,
    }),
  },

  // -- AI agent pals ---------------------------------------------------------

  muse: {
    label: 'Muse',
    color: '#9d6bff',
    tap: 'spin',
    look: 6,
    mouth: [100, 158],
    cheek: 36,
    eyes: { at: [[80, 134], [120, 134]], r: 11 },
    render: ({ id, body }) => ({
      defs: '',
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="192" rx="44" ry="6.5" fill="#000000" opacity="0.18"/>
        <!-- Cute violet boots / legs -->
        <g class="dp-leg-l" style="transform-origin: 78px 168px">
          <rect x="72" y="164" width="11" height="22" rx="5.5" fill="${body}"/>
          <ellipse class="dp-foot-l" cx="76" cy="186" rx="12" ry="6" fill="#753cd8"/>
          <circle cx="76" cy="185" r="2.5" fill="#fff3a6"/>
        </g>
        <g class="dp-leg-r" style="transform-origin: 122px 168px">
          <rect x="117" y="164" width="11" height="22" rx="5.5" fill="${body}"/>
          <ellipse class="dp-foot-r" cx="124" cy="186" rx="12" ry="6" fill="#753cd8"/>
          <circle cx="124" cy="185" r="2.5" fill="#fff3a6"/>
        </g>
        <!-- Torso with celestial curve -->
        <path class="dp-torso" fill="${body}" d="M14 170 C14 112 58 78 94 62 C88 46 100 30 118 34
          C106 40 106 54 120 58 C162 78 186 118 186 170 C176 178 144 180 100 180 C56 180 24 178 14 170 Z"/>
        <!-- Celestial arms -->
        <g class="dp-arm-l" style="transform-origin: 24px 136px">
          <ellipse cx="22" cy="144" rx="7" ry="14" transform="rotate(18 22 144)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 176px 136px">
          <ellipse cx="178" cy="144" rx="7" ry="14" transform="rotate(-18 178 144)" fill="${body}"/>
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
              <ellipse cx="${cx}" cy="134" rx="8.5" ry="12" fill="#0b0b12"/>
              <path d="M${cx + (i ? 7 : -7)} 128 l${i ? 6 : -6} -5" stroke="#0b0b12" stroke-width="3.5" stroke-linecap="round"/>
              ${eyeShine(cx - 2.5, 128, 2.6)}
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
    mouth: [100, 164],
    cheek: 46,
    eyes: { at: [[76.5, 118], [123.5, 118]], r: 12, ink: '#dff4ff', glow: true },
    render: ({ id, body }) => ({
      defs: `
        <filter id="${id('glow')}" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="192" rx="48" ry="6.5" fill="#000000" opacity="0.22"/>
        <!-- Segmented robotic legs with magnetic glowing foot pads -->
        <g class="dp-leg-l" style="transform-origin: 74px 164px">
          <rect x="66" y="160" width="16" height="24" rx="4" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <rect x="70" y="170" width="8" height="4" rx="1" fill="#00d4ff" opacity="0.75"/>
          <ellipse class="dp-foot-l" cx="74" cy="186" rx="14" ry="6" fill="#181c24" stroke="#00d4ff" stroke-width="1.5"/>
        </g>
        <g class="dp-leg-r" style="transform-origin: 126px 164px">
          <rect x="118" y="160" width="16" height="24" rx="4" fill="#2d3340" stroke="#1d222b" stroke-width="1.5"/>
          <rect x="122" y="170" width="8" height="4" rx="1" fill="#00d4ff" opacity="0.75"/>
          <ellipse class="dp-foot-r" cx="126" cy="186" rx="14" ry="6" fill="#181c24" stroke="#00d4ff" stroke-width="1.5"/>
        </g>
        <!-- Robotic chassis body -->
        <g class="dp-torso">
          <path fill="${body}" d="M14 170 L14 96 C14 64 36 44 68 44 L132 44 C164 44 186 64 186 96 L186 170 C180 178 144 180 100 180 C56 180 20 178 14 170 Z"/>
          <rect x="52" y="152" width="96" height="18" rx="6" fill="#1f2530" opacity="0.4"/>
        </g>
        <!-- Robotic clamp arms -->
        <g class="dp-arm-l" style="transform-origin: 18px 116px">
          <rect x="10" y="114" width="10" height="34" rx="5" fill="#2d3340"/>
          <circle cx="15" cy="150" r="5" fill="#00d4ff" opacity="0.8"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 182px 116px">
          <rect x="180" y="114" width="10" height="34" rx="5" fill="#2d3340"/>
          <circle cx="185" cy="150" r="5" fill="#00d4ff" opacity="0.8"/>
        </g>`,
      accessories: `
        <rect x="32" y="92" width="136" height="52" rx="26" fill="#0d1117" stroke="#252c38" stroke-width="3"/>
        <path d="M140 52 L118 86" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>`,
      face: `
        <g class="dp-look" filter="url(#${id('glow')})" fill="#dff4ff">
          <g class="dp-blink"><rect x="68" y="105" width="17" height="26" rx="8.5"/></g>
          <g class="dp-blink"><rect x="115" y="105" width="17" height="26" rx="8.5"/></g>
        </g>`,
    }),
  },

  nova: {
    label: 'Nova',
    color: '#ff7a2f',
    tap: 'jump',
    look: 7,
    mouth: [100, 156],
    cheek: 40,
    eyes: { at: [[78, 130], [122, 130]], r: 11 },
    render: ({ id, body }) => ({
      defs: `
        <radialGradient id="${id('bulb')}" cx=".4" cy=".35" r=".7">
          <stop offset="0" stop-color="#fffbe6"/>
          <stop offset=".6" stop-color="#ffe066"/>
          <stop offset="1" stop-color="#ffb000"/>
        </radialGradient>`,
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="192" rx="46" ry="6.5" fill="#000000" opacity="0.18"/>
        <!-- Sporty sneakers / legs -->
        <g class="dp-leg-l" style="transform-origin: 74px 166px">
          <rect x="68" y="162" width="13" height="22" rx="6.5" fill="${body}"/>
          <ellipse class="dp-foot-l" cx="72" cy="186" rx="13" ry="6" fill="#ffffff" stroke="#c44300" stroke-width="1.8"/>
          <path d="M64 186 Q72 184 80 186" stroke="#ff7a2f" stroke-width="1.5" fill="none"/>
        </g>
        <g class="dp-leg-r" style="transform-origin: 126px 166px">
          <rect x="119" y="162" width="13" height="22" rx="6.5" fill="${body}"/>
          <ellipse class="dp-foot-r" cx="128" cy="186" rx="13" ry="6" fill="#ffffff" stroke="#c44300" stroke-width="1.8"/>
          <path d="M120 186 Q128 184 136 186" stroke="#ff7a2f" stroke-width="1.5" fill="none"/>
        </g>
        <!-- Torso -->
        <path class="dp-torso" fill="${body}" d="M12 170 L12 140 C12 88 52 64 100 64 C148 64 188 88 188 140 L188 170 C180 178 144 180 100 180 C56 180 20 178 12 170 Z"/>
        <!-- Cute arms -->
        <g class="dp-arm-l" style="transform-origin: 22px 132px">
          <ellipse cx="20" cy="140" rx="8" ry="14" transform="rotate(18 20 140)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 178px 132px">
          <ellipse cx="180" cy="140" rx="8" ry="14" transform="rotate(-18 180 140)" fill="${body}"/>
        </g>`,
      accessories: `
        <path d="M100 68 C100 52 104 42 100 32" stroke="#2a2a33" stroke-width="5" stroke-linecap="round" fill="none"/>
        <circle class="dp-bulb" cx="100" cy="26" r="10" fill="url(#${id('bulb')})"/>`,
      face: `
        <g class="dp-look">
          <g class="dp-blink"><circle cx="78" cy="130" r="10.5" fill="#0b0b12"/>${eyeShine(75, 126, 3)}</g>
          <g class="dp-blink"><circle cx="122" cy="130" r="10.5" fill="#0b0b12"/>${eyeShine(119, 126, 3)}</g>
        </g>`,
    }),
  },

  embasa: {
    label: 'Embasa (Gota)',
    color: '#0495f4',
    fur: false,
    tap: 'jump',
    look: 8,
    mouth: [100, 138],
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
        <ellipse class="dp-shadow" cx="100" cy="190" rx="46" ry="6" fill="#000000" opacity="0.18"/>
        <!-- Articulated legs and feet -->
        <g class="dp-leg-l" style="transform-origin: 76px 172px" fill="url(#${id('foot_grad')})">
          <ellipse class="dp-foot-l" cx="76" cy="186" rx="16" ry="9" transform="rotate(-6 76 186)"/>
          <ellipse cx="74" cy="184" rx="9" ry="3.5" transform="rotate(-6 74 184)" fill="#99e8ff" opacity="0.8"/>
        </g>
        <g class="dp-leg-r" style="transform-origin: 124px 172px" fill="url(#${id('foot_grad')})">
          <ellipse class="dp-foot-r" cx="124" cy="186" rx="16" ry="9" transform="rotate(6 124 186)"/>
          <ellipse cx="122" cy="184" rx="9" ry="3.5" transform="rotate(6 122 184)" fill="#99e8ff" opacity="0.8"/>
        </g>
        <!-- Fluid Ribbon back pass -->
        <path fill="none" stroke="url(#${id('ribbon_grad')})" stroke-width="10" stroke-linecap="round" opacity="0.75"
          d="M38 140 C18 152 24 176 50 184 C80 190 120 190 150 180 C174 168 178 148 162 136"/>
        <!-- Main 3D Water Droplet Body -->
        <g class="dp-torso">
          <path fill="url(#${id('drop_body')})" stroke="#022e6b" stroke-width="1.2"
            d="M100 20 C94 48 40 92 36 128 C32 164 62 178 100 178 C138 178 168 164 164 128 C160 92 106 48 100 20 Z"/>
          <!-- 3D Specular Highlight Crescent (Glossy Water Droplet) -->
          <path fill="#ffffff" opacity="0.45"
            d="M100 26 C96 48 46 92 44 124 C42 148 54 162 66 166 C50 156 46 136 50 114 C56 84 94 36 100 26 Z"/>
          <ellipse cx="84" cy="62" rx="7" ry="16" transform="rotate(-30 84 62)" fill="#ffffff" opacity="0.65"/>
          <circle cx="83" cy="58" r="3.2" fill="#ffffff" opacity="0.95"/>
          <!-- Soft inner reflection bottom right -->
          <path fill="#38bdf8" opacity="0.35" d="M142 120 C154 140 152 165 136 174 C148 164 150 142 142 120 Z"/>
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
        <!-- Signature Embasa Fluid Ribbon (front swirl) -->
        <path fill="none" stroke="url(#${id('ribbon_grad')})" stroke-width="12" stroke-linecap="round"
          d="M34 142 C64 162 136 162 166 142"/>
        <path fill="none" stroke="#6dc152" stroke-width="3" stroke-linecap="round" opacity="0.92"
          d="M40 146 C66 164 134 164 160 146"/>
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
    mouth: [100, 154],
    cheek: 42,
    eyes: { at: [[75, 126], [125, 126]], r: 11 },
    render: ({ body }) => ({
      defs: '',
      body: `
        <!-- Soft floor contact shadow -->
        <ellipse class="dp-shadow" cx="100" cy="192" rx="46" ry="6.5" fill="#000000" opacity="0.18"/>
        <!-- Cyber cat paws / legs -->
        <g class="dp-leg-l" style="transform-origin: 74px 166px">
          <rect x="67" y="162" width="14" height="22" rx="6" fill="${body}"/>
          <ellipse class="dp-foot-l" cx="72" cy="186" rx="12" ry="6" fill="#0b7e6f"/>
          <circle cx="72" cy="185" r="2.5" fill="#5effeb"/>
        </g>
        <g class="dp-leg-r" style="transform-origin: 126px 166px">
          <rect x="119" y="162" width="14" height="22" rx="6" fill="${body}"/>
          <ellipse class="dp-foot-r" cx="128" cy="186" rx="12" ry="6" fill="#0b7e6f"/>
          <circle cx="128" cy="185" r="2.5" fill="#5effeb"/>
        </g>
        <!-- Cyber cat tail on side -->
        <g class="dp-tail" style="transform-origin: 164px 166px">
          <path d="M166 166 C184 156 190 138 184 128 C178 122 170 132 174 144 Z" fill="${body}"/>
          <circle cx="184" cy="128" r="4" fill="#5effeb"/>
        </g>
        <!-- Chassis torso & cat ears -->
        <g class="dp-torso" fill="${body}">
          <path d="M18 170 L18 116 C18 88 40 70 70 70 L130 70 C160 70 182 88 182 116 L182 170 C176 178 144 180 100 180 C56 180 24 178 18 170 Z"/>
          <path d="M40 84 L34 50 L66 74 Z M160 84 L166 50 L134 74 Z"/>
          <!-- Tech chest screen -->
          <rect x="64" y="146" width="72" height="18" rx="4" fill="#0b1b1a" opacity="0.6"/>
          <circle cx="76" cy="155" r="2.5" fill="#5effeb"/>
          <circle cx="86" cy="155" r="2.5" fill="#5effeb" opacity="0.6"/>
          <circle cx="96" cy="155" r="2.5" fill="#5effeb" opacity="0.3"/>
        </g>
        <!-- Little arms -->
        <g class="dp-arm-l" style="transform-origin: 26px 132px">
          <ellipse cx="24" cy="140" rx="7" ry="13" transform="rotate(18 24 140)" fill="${body}"/>
        </g>
        <g class="dp-arm-r" style="transform-origin: 174px 132px">
          <ellipse cx="176" cy="140" rx="7" ry="13" transform="rotate(-18 176 140)" fill="${body}"/>
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
