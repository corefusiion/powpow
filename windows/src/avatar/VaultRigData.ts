/**
 * Vault 2D Rig Data & Vector Geometry
 * Baseado estritamente nas referências oficiais:
 * - assets/avatar/character_reference.png (Frontal com thumbs-up)
 * - assets/avatar/character_poses.png (Model sheet completo de poses e expressões)
 * - assets/avatar/character_poses2.png (Detalhamento anatômico de juntas, gola, cabelo e mãos)
 *
 * Paleta Oficial:
 * - Azul do Fato (Jumpsuit): #1E6BB8 / sombra #14518D
 * - Amarelo dos Detalhes (Gola, Faixa, Cinto, Cabelo): #FFD700 / sombra #D4A800
 * - Pele: #F8D7B6 / sombra #E4B890
 * - Sapatos: #2B2B2B / detalhe #1A1A1A
 * - Contornos: #000000 com traço cartoon retrô uniforme (stroke-width: 3)
 */

export interface JointPivot {
  x: number;
  y: number;
  minAngle: number;
  maxAngle: number;
  defaultAngle: number;
}

export type BoneKey =
  | 'root'
  | 'pelvis'
  | 'torso'
  | 'neck'
  | 'head'
  | 'shoulder_right'
  | 'elbow_right'
  | 'wrist_right'
  | 'shoulder_left'
  | 'elbow_left'
  | 'wrist_left'
  | 'hip_right'
  | 'knee_right'
  | 'ankle_right'
  | 'hip_left'
  | 'knee_left'
  | 'ankle_left';

export const VAULT_PALETTE = {
  blue: '#1E6BB8',
  blueDark: '#14518D',
  yellow: '#FFD700',
  yellowDark: '#D4A800',
  skin: '#F8D7B6',
  skinDark: '#E4B890',
  shoes: '#2B2B2B',
  shoesDark: '#1A1A1A',
  white: '#FFFFFF',
  outline: '#000000',
  strokeWidth: 3,
};

export const VAULT_PIVOTS: Record<BoneKey, JointPivot> = {
  root: { x: 200, y: 310, minAngle: -20, maxAngle: 20, defaultAngle: 0 },
  pelvis: { x: 200, y: 310, minAngle: -15, maxAngle: 15, defaultAngle: 0 },
  torso: { x: 200, y: 300, minAngle: -25, maxAngle: 25, defaultAngle: 0 },
  neck: { x: 200, y: 195, minAngle: -20, maxAngle: 20, defaultAngle: 0 },
  head: { x: 200, y: 185, minAngle: -35, maxAngle: 35, defaultAngle: 0 },
  // Braço direito (lado do polegar - espectador vê à esquerda)
  shoulder_right: { x: 150, y: 220, minAngle: -120, maxAngle: 120, defaultAngle: -25 },
  elbow_right: { x: 115, y: 220, minAngle: -140, maxAngle: 50, defaultAngle: -45 },
  wrist_right: { x: 85, y: 175, minAngle: -45, maxAngle: 45, defaultAngle: 0 },
  // Braço esquerdo (mão na cintura - espectador vê à direita)
  shoulder_left: { x: 245, y: 220, minAngle: -120, maxAngle: 120, defaultAngle: 20 },
  elbow_left: { x: 285, y: 255, minAngle: -40, maxAngle: 140, defaultAngle: 45 },
  wrist_left: { x: 295, y: 305, minAngle: -45, maxAngle: 45, defaultAngle: 0 },
  // Perna direita (espectador vê à esquerda)
  hip_right: { x: 175, y: 325, minAngle: -60, maxAngle: 60, defaultAngle: -5 },
  knee_right: { x: 165, y: 410, minAngle: -10, maxAngle: 100, defaultAngle: 5 },
  ankle_right: { x: 155, y: 475, minAngle: -30, maxAngle: 30, defaultAngle: 0 },
  // Perna esquerda (espectador vê à direita)
  hip_left: { x: 225, y: 325, minAngle: -60, maxAngle: 60, defaultAngle: 5 },
  knee_left: { x: 235, y: 410, minAngle: -10, maxAngle: 100, defaultAngle: -5 },
  ankle_left: { x: 245, y: 475, minAngle: -30, maxAngle: 30, defaultAngle: 0 },
};

/**
 * Elementos de SVG vectoriais reutilizáveis e articulados.
 * Cada junta possui cobertura circular sobreposta (overlap caps)
 * para garantir que nenhuma rotação gere vãos, descontinuidades de contorno ou furos.
 */
export const VAULT_RIG_SVG = `
<!-- Definições de Estilos, Filtros e Clips -->
<defs>
  <!-- Clipping dos Olhos para que as pupilas fiquem restritas à esclera -->
  <clipPath id="vault-eye-left-clip">
    <ellipse cx="218" cy="148" rx="8" ry="11" />
  </clipPath>
  <clipPath id="vault-eye-right-clip">
    <ellipse cx="184" cy="148" rx="8" ry="11" />
  </clipPath>

  <!-- Filtro de sombra suave para o chão -->
  <radialGradient id="vault-floor-shadow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#000000" stop-opacity="0.32" />
    <stop offset="60%" stop-color="#000000" stop-opacity="0.14" />
    <stop offset="100%" stop-color="#000000" stop-opacity="0" />
  </radialGradient>
</defs>

<!-- Sombra de Contato com o Chão -->
<ellipse class="vault-floor-shadow" cx="200" cy="495" rx="85" ry="14" fill="url(#vault-floor-shadow)" />

<!-- ========================================== -->
<!-- HIERARQUIA DO ESQUELETO 2D ARTICULADO      -->
<!-- ========================================== -->
<g id="vault-root" class="vault-bone" style="transform-origin: 200px 310px;">

  <!-- ========================================== -->
  <!-- CAMADA INFERIOR: MEMBROS INFERIORES        -->
  <!-- ========================================== -->

  <!-- PERNA DIREITA (Espectador vê à esquerda) -->
  <g id="bone-hip-right" class="vault-bone" style="transform-origin: 175px 325px;">
    <!-- Junta do Quadril Direito (overlap circular) -->
    <circle cx="175" cy="325" r="16" fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />

    <!-- Coxa Direita -->
    <path d="M161 325 L151 410 C151 418 179 418 179 410 L189 325 Z"
          fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

    <!-- Perna Inferior / Joelho Direito -->
    <g id="bone-knee-right" class="vault-bone" style="transform-origin: 165px 410px;">
      <!-- Junta do Joelho Direito (overlap circular) -->
      <circle cx="165" cy="410" r="15" fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />

      <!-- Canela / Calça Direita -->
      <path d="M152 410 L144 472 C144 476 166 476 166 472 L178 410 Z"
            fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
      <!-- Dobra da Barra da Calça -->
      <path d="M143 468 C153 472 162 471 168 467"
            fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linecap="round" />

      <!-- Tornozelo e Sapato Direito -->
      <g id="bone-ankle-right" class="vault-bone" style="transform-origin: 155px 475px;">
        <!-- Sapato Preto clássico com bico arredondado -->
        <path d="M142 472 C135 478 128 488 132 494 C136 498 165 498 172 494 C175 488 169 475 166 472 Z"
              fill="${VAULT_PALETTE.shoes}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
        <!-- Detalhe da Sola -->
        <path d="M132 493 C145 496 162 496 172 493"
              fill="none" stroke="${VAULT_PALETTE.shoesDark}" stroke-width="2" stroke-linecap="round" />
      </g>
    </g>
  </g>

  <!-- PERNA ESQUERDA (Espectador vê à direita) -->
  <g id="bone-hip-left" class="vault-bone" style="transform-origin: 225px 325px;">
    <!-- Junta do Quadril Esquerdo (overlap circular) -->
    <circle cx="225" cy="325" r="16" fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />

    <!-- Coxa Esquerda -->
    <path d="M211 325 L221 410 C221 418 249 418 249 410 L239 325 Z"
          fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

    <!-- Perna Inferior / Joelho Esquerdo -->
    <g id="bone-knee-left" class="vault-bone" style="transform-origin: 235px 410px;">
      <!-- Junta do Joelho Esquerdo (overlap circular) -->
      <circle cx="235" cy="410" r="15" fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />

      <!-- Canela / Calça Esquerda -->
      <path d="M222 410 L234 472 C234 476 256 476 256 472 L248 410 Z"
            fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
      <!-- Dobra da Barra da Calça -->
      <path d="M232 467 C238 471 247 472 257 468"
            fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linecap="round" />

      <!-- Tornozelo e Sapato Esquerdo -->
      <g id="bone-ankle-left" class="vault-bone" style="transform-origin: 245px 475px;">
        <!-- Sapato Preto clássico com bico arredondado voltado para fora -->
        <path d="M234 472 C231 475 225 488 228 494 C235 498 264 498 268 494 C272 488 265 478 258 472 Z"
              fill="${VAULT_PALETTE.shoes}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
        <!-- Detalhe da Sola -->
        <path d="M228 493 C238 496 255 496 268 493"
              fill="none" stroke="${VAULT_PALETTE.shoesDark}" stroke-width="2" stroke-linecap="round" />
      </g>
    </g>
  </g>

  <!-- ========================================== -->
  <!-- QUADRIL / BACIA / CINTURA                  -->
  <!-- ========================================== -->
  <g id="bone-pelvis" class="vault-bone" style="transform-origin: 200px 310px;">
    <!-- Base azul da virilha/junção das calças -->
    <path d="M165 310 C165 330 190 345 200 345 C210 345 235 330 235 310 Z"
          fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
    <!-- Vinco de costura central -->
    <path d="M200 316 L200 338"
          fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />

    <!-- Cinto Amarelo Largo Oficial (#FFD700) -->
    <path d="M164 290 C186 295 214 295 236 290 L237 312 C215 318 185 318 163 312 Z"
          fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
  </g>

  <!-- ========================================== -->
  <!-- TRONCO & MEMBROS SUPERIORES                -->
  <!-- ========================================== -->
  <g id="bone-torso" class="vault-bone" style="transform-origin: 200px 300px;">
    <!-- Corpo / Jaqueta Azul do Fato -->
    <path d="M160 220 C155 255 163 290 164 292 C186 296 214 296 236 292 C237 290 245 255 240 220 C220 222 180 222 160 220 Z"
          fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

    <!-- Faixa Amarela Vertical Central (#FFD700) -->
    <path d="M193 216 L193 294 C198 295 202 295 207 294 L207 216 Z"
          fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

    <!-- Gola Amarela Arredondada (#FFD700) -->
    <path d="M174 205 C186 220 214 220 226 205 C232 216 218 226 200 226 C182 226 168 216 174 205 Z"
          fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

    <!-- Vincos sutis da roupa no tórax -->
    <path d="M168 252 C176 256 182 258 189 256"
          fill="none" stroke="${VAULT_PALETTE.blueDark}" stroke-width="2" stroke-linecap="round" />
    <path d="M232 254 C224 258 218 260 211 258"
          fill="none" stroke="${VAULT_PALETTE.blueDark}" stroke-width="2" stroke-linecap="round" />

    <!-- ========================================== -->
    <!-- BRAÇO ESQUERDO (Mão na cintura - Viewer Direita) -->
    <!-- ========================================== -->
    <g id="bone-shoulder-left" class="vault-bone" style="transform-origin: 245px 220px;">
      <!-- Junta do Ombro Esquerdo (overlap circular) -->
      <circle cx="245" cy="220" r="16" fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />

      <!-- Braço Superior Esquerdo -->
      <path d="M236 210 L280 248 C288 255 282 268 274 262 L232 224 Z"
            fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

      <!-- Antebraço Esquerdo & Cotovelo -->
      <g id="bone-elbow-left" class="vault-bone" style="transform-origin: 285px 255px;">
        <!-- Junta do Cotovelo Esquerdo (overlap circular) -->
        <circle cx="285" cy="255" r="14" fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />

        <!-- Antebraço Esquerdo dobrando em direção à cintura -->
        <path d="M276 248 L288 300 C292 308 304 304 300 294 L294 248 Z"
              fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

        <!-- Punho Amarelo da Manga (#FFD700) -->
        <path d="M284 298 C290 304 299 304 303 296 L305 304 C299 312 288 310 282 304 Z"
              fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

        <!-- Mão Esquerda (Poses Alternáveis) -->
        <g id="bone-wrist-left" class="vault-bone" style="transform-origin: 295px 305px;">
          <!-- Pose 1: Na Cintura (Padrão Oficial) -->
          <g id="vault-hand-left-hip" class="vault-hand-pose">
            <path d="M286 304 C280 308 278 318 284 324 C292 328 302 322 304 314 C305 308 298 304 292 304 Z"
                  fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
            <!-- Detalhe dos nós dos dedos recolhidos -->
            <path d="M286 314 C290 316 295 316 298 314"
                  fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          </g>

          <!-- Pose 2: Aberta / Relaxada -->
          <g id="vault-hand-left-open" class="vault-hand-pose" style="display: none;">
            <path d="M288 304 C284 312 284 326 292 332 C298 334 306 328 306 318 C306 310 298 304 292 304 Z"
                  fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
            <path d="M292 318 L292 328 M297 318 L297 328"
                  fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          </g>

          <!-- Pose 3: Punho Fechado -->
          <g id="vault-hand-left-fist" class="vault-hand-pose" style="display: none;">
            <circle cx="294" cy="314" r="12" fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />
            <path d="M288 312 C292 316 296 316 300 312" fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          </g>

          <!-- Pose 4: Apontando para o lado -->
          <g id="vault-hand-left-pointing" class="vault-hand-pose" style="display: none;">
            <path d="M288 304 C286 312 288 318 294 322 L318 322 C324 322 324 316 318 316 L298 316 C298 310 294 306 288 304 Z"
                  fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
          </g>
        </g>
      </g>
    </g>

    <!-- ========================================== -->
    <!-- PESCOÇO & CABEÇA                           -->
    <!-- ========================================== -->
    <g id="bone-neck" class="vault-bone" style="transform-origin: 200px 195px;">
      <!-- Pescoço (Pele) com contorno de inserção na gola -->
      <path d="M190 178 L190 206 C196 210 204 210 210 206 L210 178 Z"
            fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
      <path d="M192 196 C198 200 202 200 208 196"
            fill="none" stroke="${VAULT_PALETTE.skinDark}" stroke-width="2" stroke-linecap="round" />

      <!-- CABEÇA E ELEMENTOS FACIAIS -->
      <g id="bone-head" class="vault-bone" style="transform-origin: 200px 185px;">

        <!-- Cabelo - Camada Traseira (Dá volume atrás da orelha esquerda) -->
        <path d="M152 145 C146 118 160 88 186 78 C216 66 244 80 252 106 C256 122 254 140 248 152 Z"
              fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

        <!-- Orelha Direita (Viewer Esquerda) -->
        <path d="M162 142 C154 142 152 156 160 162 C164 165 168 162 168 156 Z"
              fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
        <path d="M159 148 C158 153 162 156 164 153"
              fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="1.8" stroke-linecap="round" />

        <!-- Orelha Esquerda (Viewer Direita) -->
        <path d="M238 142 C246 142 248 156 240 162 C236 165 232 162 232 156 Z"
              fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
        <path d="M241 148 C242 153 238 156 236 153"
              fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="1.8" stroke-linecap="round" />

        <!-- Contorno do Rosto / Mandíbula / Queixo arredondado com Covinha -->
        <path d="M164 135 C162 162 170 190 194 196 C198 197 202 197 206 196 C230 190 238 162 236 135 C230 105 170 105 164 135 Z"
              fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
        <!-- Covinha no queixo -->
        <path d="M198 190 C199 192 201 192 202 190"
              fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />

        <!-- Cabelo Frontal com Topete Característico e Mechas Retrô -->
        <g id="vault-hair-front">
          <!-- Mecha frontal ondulada clássica -->
          <path d="M158 135 C156 105 170 75 198 72 C222 70 248 84 250 114 C252 130 248 142 244 146 C240 134 236 122 228 116 C220 120 216 124 210 116 C202 110 194 116 186 114 C176 114 168 124 162 136 Z"
                fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
          <!-- Mechas secundárias curvas do topete -->
          <path d="M194 72 C190 62 198 56 208 58 C218 60 220 70 214 74"
                fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
          <path d="M178 78 C172 68 180 62 188 66"
                fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
          <!-- Hachuras de textura do cabelo acima da orelha (4 linhas retrô) -->
          <line x1="230" y1="126" x2="238" y2="134" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          <line x1="233" y1="122" x2="241" y2="130" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          <line x1="236" y1="118" x2="244" y2="126" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          <line x1="239" y1="114" x2="246" y2="121" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
        </g>

        <!-- SOBRANCELHAS ARTICULADAS -->
        <!-- Sobrancelha Direita (Viewer Esquerda) -->
        <g id="vault-eyebrow-right" style="transform-origin: 184px 135px;">
          <path d="M175 137 C180 132 189 132 194 136"
                fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2.8" stroke-linecap="round" />
        </g>
        <!-- Sobrancelha Esquerda (Viewer Direita) -->
        <g id="vault-eyebrow-left" style="transform-origin: 216px 135px;">
          <path d="M206 136 C211 132 220 132 225 137"
                fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2.8" stroke-linecap="round" />
        </g>

        <!-- OLHOS E PUPILAS INDEPENDENTES -->
        <!-- Olho Direito (Viewer Esquerda) -->
        <g id="vault-eye-right-group">
          <!-- Esclera Branca com Contorno -->
          <ellipse cx="184" cy="148" rx="8" ry="11"
                   fill="${VAULT_PALETTE.white}" stroke="${VAULT_PALETTE.outline}" stroke-width="2.2" />
          <!-- Pupila Móvel presa pelo ClipPath -->
          <g clip-path="url(#vault-eye-right-clip)">
            <g id="vault-pupil-right" style="transform: translate(0px, 0px);">
              <circle cx="184" cy="148" r="5.2" fill="${VAULT_PALETTE.outline}" />
              <!-- Ponto de Luz / Brilho do Olhar -->
              <circle cx="182.5" cy="145.5" r="1.6" fill="${VAULT_PALETTE.white}" />
            </g>
          </g>
          <!-- Pálpebra / Piscar (Blink) -->
          <path id="vault-eyelid-right" d="M175 148 Q184 148 193 148"
                fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2.6" stroke-linecap="round" style="display: none;" />
        </g>

        <!-- Olho Esquerdo (Viewer Direita) -->
        <g id="vault-eye-left-group">
          <!-- Esclera Branca com Contorno -->
          <ellipse cx="218" cy="148" rx="8" ry="11"
                   fill="${VAULT_PALETTE.white}" stroke="${VAULT_PALETTE.outline}" stroke-width="2.2" />
          <!-- Pupila Móvel presa pelo ClipPath -->
          <g clip-path="url(#vault-eye-left-clip)">
            <g id="vault-pupil-left" style="transform: translate(0px, 0px);">
              <circle cx="218" cy="148" r="5.2" fill="${VAULT_PALETTE.outline}" />
              <!-- Ponto de Luz / Brilho do Olhar -->
              <circle cx="216.5" cy="145.5" r="1.6" fill="${VAULT_PALETTE.white}" />
            </g>
          </g>
          <!-- Pálpebra / Piscar (Blink) -->
          <path id="vault-eyelid-left" d="M209 148 Q218 148 227 148"
                fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2.6" stroke-linecap="round" style="display: none;" />
        </g>

        <!-- NARIZ RETRÔ ANGULAR (Traço angular em '<' clássico) -->
        <path d="M201 146 L196 157 L203 158"
              fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />

        <!-- BOCAS ALTERNÁVEIS (Expressões da Model Sheet) -->
        <g id="vault-mouth-group">
          <!-- Boca 1: Sorriso Normal Confiante com Dentes Superiores (Padrão Oficial) -->
          <g id="vault-mouth-normal" class="vault-mouth-variant">
            <path d="M184 167 C190 178 212 178 218 167 Z"
                  fill="${VAULT_PALETTE.white}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
            <!-- Linha dos lábios com covinhas nos cantos -->
            <path d="M181 166 C184 168 190 167 201 167 C212 167 218 168 221 166"
                  fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2.4" stroke-linecap="round" />
            <path d="M181 164 L183 168 M219 168 L221 164"
                  fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          </g>

          <!-- Boca 2: Sorriso Aberto / Feliz (Dentes + Língua) -->
          <g id="vault-mouth-happy" class="vault-mouth-variant" style="display: none;">
            <path d="M182 166 C188 184 214 184 220 166 Z"
                  fill="#781010" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
            <!-- Dentes superiores brancos -->
            <path d="M184 166 L218 166 C216 172 186 172 184 166 Z" fill="${VAULT_PALETTE.white}" />
            <!-- Língua rosada -->
            <path d="M192 182 C196 176 206 176 210 182 Z" fill="#F87171" />
          </g>

          <!-- Boca 3: Surpreso ('O' Arredondado) -->
          <g id="vault-mouth-surprised" class="vault-mouth-variant" style="display: none;">
            <ellipse cx="201" cy="172" rx="7" ry="10"
                     fill="#781010" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />
          </g>

          <!-- Boca 4: Pensativo / Incerto (Linha ondulada) -->
          <g id="vault-mouth-thinking" class="vault-mouth-variant" style="display: none;">
            <path d="M186 170 C192 173 198 168 206 171 C212 173 216 169 218 168"
                  fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2.6" stroke-linecap="round" />
          </g>

          <!-- Boca 5: Triste / Desapontado (Curva para baixo) -->
          <g id="vault-mouth-sad" class="vault-mouth-variant" style="display: none;">
            <path d="M185 174 C192 168 210 168 217 174"
                  fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2.6" stroke-linecap="round" />
          </g>

          <!-- Boca 6: Fala Aberta (Lip-Sync) -->
          <g id="vault-mouth-talking" class="vault-mouth-variant" style="display: none;">
            <path d="M185 167 C188 178 214 178 217 167 Z"
                  fill="#781010" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
            <path d="M187 167 L215 167" stroke="${VAULT_PALETTE.white}" stroke-width="3" stroke-linecap="round" />
          </g>
        </g>
      </g>
    </g>

    <!-- ========================================== -->
    <!-- BRAÇO DIREITO (Polegar Cima - Viewer Esquerda) -->
    <!-- ========================================== -->
    <g id="bone-shoulder-right" class="vault-bone" style="transform-origin: 150px 220px;">
      <!-- Junta do Ombro Direito (overlap circular) -->
      <circle cx="150" cy="220" r="16" fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />

      <!-- Braço Superior Direito estendendo em direção ao espectador -->
      <path d="M158 210 L118 216 C110 218 110 232 118 234 L156 230 Z"
            fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

      <!-- Antebraço Direito erguendo o polegar -->
      <g id="bone-elbow-right" class="vault-bone" style="transform-origin: 115px 220px;">
        <!-- Junta do Cotovelo Direito (overlap circular) -->
        <circle cx="115" cy="220" r="14" fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />

        <!-- Manga do Antebraço Direito erguendo-se -->
        <path d="M122 226 L92 182 C86 174 76 182 82 190 L112 234 Z"
              fill="${VAULT_PALETTE.blue}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

        <!-- Punho Amarelo da Manga (#FFD700) -->
        <path d="M80 184 C86 178 94 184 98 190 L92 196 C86 190 78 188 74 192 Z"
              fill="${VAULT_PALETTE.yellow}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />

        <!-- MÃO DIREITA (Poses Alternáveis) -->
        <g id="bone-wrist-right" class="vault-bone" style="transform-origin: 85px 175px;">

          <!-- Pose 1: O Polegar Pra Cima (Thumbs-Up Oficial) -->
          <g id="vault-hand-right-thumbs-up" class="vault-hand-pose">
            <!-- Dedos curvados recolhidos -->
            <path d="M72 170 C64 172 58 182 62 192 C68 200 84 200 90 192 C94 184 88 172 80 170 Z"
                  fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
            <!-- Dobras individuais dos 3 dedos recolhidos -->
            <path d="M64 176 C72 180 80 180 86 176" fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
            <path d="M63 184 C71 188 79 188 85 184" fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
            <path d="M66 192 C72 194 78 194 84 192" fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />

            <!-- Polegar Erguido Imponente com Curvatura Clássica -->
            <path d="M74 170 C72 152 70 134 78 126 C86 118 96 126 92 142 C90 152 86 164 84 172 Z"
                  fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
            <!-- Junta/Vinco da falange do polegar -->
            <path d="M78 142 C82 144 86 144 89 142" fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          </g>

          <!-- Pose 2: Acenando (Wave / Mão aberta) -->
          <g id="vault-hand-right-wave" class="vault-hand-pose" style="display: none;">
            <path d="M66 168 C62 156 66 138 74 134 C80 132 86 136 86 144 L86 160 C90 156 96 156 98 162 C100 168 96 174 92 178 Z"
                  fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
            <!-- Divisão dos 4 dedos abertos -->
            <line x1="74" y1="135" x2="74" y2="152" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
            <line x1="80" y1="136" x2="80" y2="154" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          </g>

          <!-- Pose 3: Comemorando / Punho Erguido (Fist) -->
          <g id="vault-hand-right-fist" class="vault-hand-pose" style="display: none;">
            <circle cx="82" cy="165" r="14" fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" />
            <path d="M74 162 C78 166 84 166 88 162 M74 168 C78 172 84 172 88 168"
                  fill="none" stroke="${VAULT_PALETTE.outline}" stroke-width="2" stroke-linecap="round" />
          </g>

          <!-- Pose 4: Apontando com Indicador (Pointing) -->
          <g id="vault-hand-right-pointing" class="vault-hand-pose" style="display: none;">
            <path d="M80 175 C72 175 66 170 66 162 L42 162 C36 162 36 154 42 154 L68 154 C70 148 76 146 82 148 Z"
                  fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
          </g>

          <!-- Pose 5: Mão Relaxada Aberta -->
          <g id="vault-hand-right-open" class="vault-hand-pose" style="display: none;">
            <path d="M72 175 C66 165 68 150 78 144 C86 142 94 150 92 162 C90 172 84 178 76 178 Z"
                  fill="${VAULT_PALETTE.skin}" stroke="${VAULT_PALETTE.outline}" stroke-width="${VAULT_PALETTE.strokeWidth}" stroke-linejoin="round" />
          </g>
        </g>
      </g>
    </g>
  </g>
</g>
`;

/**
 * Poses predefinidas (presets) baseadas na model sheet de character_poses.png.
 * Cada pose define as rotações em graus de cada osso articulado.
 */
export const VAULT_POSE_PRESETS: Record<string, Partial<Record<BoneKey, number>>> = {
  // 1. Pose Oficial Frontal (Aprovando com polegar)
  reference: {
    root: 0,
    pelvis: 0,
    torso: 0,
    neck: 0,
    head: 0,
    shoulder_right: -25,
    elbow_right: -45,
    wrist_right: 0,
    shoulder_left: 20,
    elbow_left: 45,
    wrist_left: 0,
    hip_right: -4,
    knee_right: 6,
    ankle_right: 0,
    hip_left: 6,
    knee_left: -4,
    ankle_left: 0,
  },

  // 2. Caminhada (Passo / Stride)
  walk_stride: {
    root: 0,
    pelvis: 3,
    torso: -4,
    neck: 2,
    head: 2,
    shoulder_right: 28,
    elbow_right: -15,
    wrist_right: 0,
    shoulder_left: -32,
    elbow_left: 25,
    wrist_left: 0,
    hip_right: -28,
    knee_right: 22,
    ankle_right: 8,
    hip_left: 26,
    knee_left: 12,
    ankle_left: -6,
  },

  // 3. Acenando (Waving)
  waving: {
    root: 0,
    pelvis: 0,
    torso: 2,
    neck: -2,
    head: -4,
    shoulder_right: -110,
    elbow_right: 40,
    wrist_right: 15,
    shoulder_left: 15,
    elbow_left: 30,
    wrist_left: 0,
    hip_right: -4,
    knee_right: 5,
    ankle_right: 0,
    hip_left: 4,
    knee_left: -5,
    ankle_left: 0,
  },

  // 4. Apontando (Pointing)
  pointing: {
    root: 0,
    pelvis: 0,
    torso: 4,
    neck: 2,
    head: 4,
    shoulder_right: -85,
    elbow_right: -10,
    wrist_right: 0,
    shoulder_left: 20,
    elbow_left: 45,
    wrist_left: 0,
    hip_right: -5,
    knee_right: 6,
    ankle_right: 0,
    hip_left: 6,
    knee_left: -4,
    ankle_left: 0,
  },

  // 5. Pensativo (Thinking)
  thinking: {
    root: 0,
    pelvis: 0,
    torso: -3,
    neck: 4,
    head: 8,
    shoulder_right: -75,
    elbow_right: -60,
    wrist_right: -15,
    shoulder_left: 22,
    elbow_left: 50,
    wrist_left: 0,
    hip_right: -4,
    knee_right: 5,
    ankle_right: 0,
    hip_left: 5,
    knee_left: -4,
    ankle_left: 0,
  },

  // 6. Comemorando (Celebrating - Braços erguidos em V)
  celebrating: {
    root: 0,
    pelvis: 0,
    torso: 0,
    neck: -4,
    head: -6,
    shoulder_right: -115,
    elbow_right: -35,
    wrist_right: 10,
    shoulder_left: 115,
    elbow_left: 35,
    wrist_left: -10,
    hip_right: -8,
    knee_right: 12,
    ankle_right: 0,
    hip_left: 8,
    knee_left: 12,
    ankle_left: 0,
  },

  // 7. Braços Cruzados (Crossed)
  crossed: {
    root: 0,
    pelvis: 0,
    torso: 0,
    neck: 0,
    head: 0,
    shoulder_right: -45,
    elbow_right: -85,
    wrist_right: -10,
    shoulder_left: 45,
    elbow_left: 85,
    wrist_left: 10,
    hip_right: -4,
    knee_right: 6,
    ankle_right: 0,
    hip_left: 5,
    knee_left: -4,
    ankle_left: 0,
  },
};
