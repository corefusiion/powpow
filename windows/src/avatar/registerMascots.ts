import { characters, registerCharacter } from '../../../src/characters.js';
import { MASCOTS_CATALOG } from './mascotCatalog';

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
      look: 8,
      mouth: [100, 180],
      cheek: 36,
      render: ({ id }: { id: (name: string) => string }) => ({
        defs: `
          <clipPath id="${id('mascot_clip')}">
            <rect x="15" y="35" width="170" height="170" rx="32"/>
          </clipPath>
        `,
        body: `
          <!-- Sombra e Base -->
          <ellipse cx="100" cy="225" rx="55" ry="14" fill="#000000" opacity="0.25"/>
          <!-- Sprite Center Cell (Row 1, Col 1) -->
          <g clip-path="url(#${id('mascot_clip')})">
            <image href="/mascots/${mascot.id}-directions.webp" x="-155" y="-135" width="510" height="510" preserveAspectRatio="none"/>
          </g>
        `,
        accessories: `
          <!-- Borda sutil de destaque -->
          <rect x="15" y="35" width="170" height="170" rx="32" fill="none" stroke="${mascot.color}" stroke-width="2.5" opacity="0.45"/>
        `,
        face: ``,
      }),
    });
  }
}
