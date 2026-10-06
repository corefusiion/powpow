// Embasa Mascot High-Fidelity Vector Data (Reformulated 3D Pixar/Disney Edition)
// 100% clean bezier curves, liquid volumetric shading, vibrant Embasa tricolor ribbon,
// large lively cartoon eyes with starburst sparkles, cheerful smile, and running limbs.
// Fully compliant with AvatarAPI (18 semantic IDs).

export const EMBASA_DEFS = `
<radialGradient id="embasa_body_grad" cx="38%" cy="28%" r="72%">
  <stop offset="0%" stop-color="#99e8ff"/>
  <stop offset="18%" stop-color="#38c6ff"/>
  <stop offset="52%" stop-color="#0495f4"/>
  <stop offset="82%" stop-color="#0454b0"/>
  <stop offset="100%" stop-color="#012b6b"/>
</radialGradient>

<radialGradient id="embasa_eye_sclera" cx="42%" cy="32%" r="68%">
  <stop offset="0%" stop-color="#ffffff"/>
  <stop offset="80%" stop-color="#f0f7ff"/>
  <stop offset="100%" stop-color="#cfe5fc"/>
</radialGradient>

<radialGradient id="embasa_eye_iris" cx="40%" cy="36%" r="65%">
  <stop offset="0%" stop-color="#011638"/>
  <stop offset="48%" stop-color="#044da8"/>
  <stop offset="82%" stop-color="#0495f4"/>
  <stop offset="100%" stop-color="#38bdf8"/>
</radialGradient>

<linearGradient id="embasa_ribbon_green" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#8be22e"/>
  <stop offset="100%" stop-color="#55a828"/>
</linearGradient>

<linearGradient id="embasa_ribbon_yellow" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#fff752"/>
  <stop offset="100%" stop-color="#f4c01e"/>
</linearGradient>

<linearGradient id="embasa_ribbon_orange" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#ff911a"/>
  <stop offset="100%" stop-color="#e05800"/>
</linearGradient>

<linearGradient id="embasa_ribbon_cyan" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#38d4ff"/>
  <stop offset="100%" stop-color="#0288d1"/>
</linearGradient>

<linearGradient id="embasa_ribbon_blue" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#0277bd"/>
  <stop offset="100%" stop-color="#013f8a"/>
</linearGradient>

<linearGradient id="embasa_limb_grad" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#38c6ff"/>
  <stop offset="100%" stop-color="#046dc8"/>
</linearGradient>

<linearGradient id="embasa_foot_grad" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#24baf8"/>
  <stop offset="100%" stop-color="#034898"/>
</linearGradient>

<radialGradient id="embasa_mouth_inside" cx="50%" cy="30%" r="70%">
  <stop offset="0%" stop-color="#540a16"/>
  <stop offset="100%" stop-color="#220206"/>
</radialGradient>

<linearGradient id="embasa_tongue_grad" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#ff7b92"/>
  <stop offset="100%" stop-color="#e1244e"/>
</linearGradient>

<filter id="embasa_soft_blur" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur stdDeviation="8"/>
</filter>
`;

export const EMBASA_GRADIENTS = EMBASA_DEFS;

export const EMBASA_INNER_SVG = `
<!-- Ribbon Back Pass (Passando por trás da cintura e esvoaçando) -->
<g id="ribbon-back" class="part-ribbon">
  <!-- Cauda esvoaçante da fita (Verde / Amarelo / Laranja) -->
  <path d="M260 620 C140 650 90 720 120 780 C150 840 230 840 270 810 C210 820 160 800 145 760 C130 720 180 670 270 650 Z" fill="url(#embasa_ribbon_green)"/>
  <path d="M270 650 C180 670 130 720 145 760 C160 800 210 820 270 810 C240 800 200 780 190 750 C180 720 220 680 290 665 Z" fill="url(#embasa_ribbon_yellow)"/>
  <path d="M290 665 C220 680 180 720 190 750 C200 780 240 800 270 810 C290 800 320 780 340 760 C290 770 250 750 240 730 C230 710 250 685 305 678 Z" fill="url(#embasa_ribbon_orange)"/>
  <!-- Passagem por trás da cintura -->
  <path d="M330 630 C450 670 650 670 760 600 C730 580 620 635 340 615 Z" fill="url(#embasa_ribbon_blue)" opacity="0.65"/>
</g>

<!-- Pernas e Pés de Água (Correndo) -->
<g id="left-leg" class="part-leg">
  <!-- Perna esquerda esticada -->
  <path d="M420 730 C380 770 330 810 320 860 C310 900 340 920 370 910 C410 890 440 820 460 760 Z" fill="url(#embasa_limb_grad)"/>
  <!-- Pé esquerdo em gota d'água -->
  <g id="left-foot" class="part-foot">
    <ellipse cx="340" cy="880" rx="42" ry="26" transform="rotate(-20 340 880)" fill="url(#embasa_foot_grad)"/>
    <ellipse cx="330" cy="874" rx="28" ry="12" transform="rotate(-20 330 874)" fill="#8ae0ff" opacity="0.75"/>
  </g>
</g>

<g id="right-leg" class="part-leg">
  <!-- Perna direita avançando -->
  <path d="M570 740 C610 780 650 830 680 870 C700 900 680 930 640 940 C600 940 570 880 540 810 Z" fill="url(#embasa_limb_grad)"/>
  <!-- Pé direito apoiando -->
  <g id="right-foot" class="part-foot">
    <ellipse cx="660" cy="900" rx="46" ry="28" transform="rotate(25 660 900)" fill="url(#embasa_foot_grad)"/>
    <ellipse cx="650" cy="894" rx="30" ry="14" transform="rotate(25 650 894)" fill="#8ae0ff" opacity="0.75"/>
  </g>
</g>

<!-- Braço Esquerdo (Atrás) -->
<g id="left-arm" class="part-arm">
  <path d="M290 530 C200 520 120 540 90 580 C80 600 100 620 130 610 C170 590 230 570 280 560 Z" fill="url(#embasa_limb_grad)"/>
  <!-- Mão esquerda fofa -->
  <g id="left-hand" class="part-hand">
    <circle cx="105" cy="595" r="24" fill="url(#embasa_limb_grad)"/>
    <circle cx="95" cy="580" r="12" fill="url(#embasa_limb_grad)"/>
    <circle cx="100" cy="590" r="10" fill="#99e8ff" opacity="0.6"/>
  </g>
</g>

<!-- Corpo Principal da Gota d'Água 3D -->
<g id="body" class="part-body">
  <!-- Sombra projetada no chão -->
  <ellipse cx="512" cy="950" rx="220" ry="32" fill="#000000" opacity="0.22" filter="url(#embasa_soft_blur)"/>

  <!-- Silhueta da Gota com Ponta Aerodinâmica e Barriguinha Fofa -->
  <path d="M512 85 C485 180 250 380 220 580 C185 750 330 870 512 870 C694 870 839 750 804 580 C774 380 539 180 512 85 Z" fill="url(#embasa_body_grad)"/>

  <!-- Brilho Especular 3D Principal (Crescente de Água Cristalina no topo/esquerda) -->
  <path d="M512 110 C490 200 290 390 260 560 C235 700 300 790 350 820 C290 770 250 680 270 550 C295 400 480 210 512 110 Z" fill="#ffffff" opacity="0.48"/>
  <ellipse cx="370" cy="270" rx="35" ry="90" transform="rotate(-34 370 270)" fill="#ffffff" opacity="0.32"/>

  <!-- Ponto de Luz Intenso (Glint) no topo da curvatura -->
  <ellipse cx="440" cy="180" rx="18" ry="38" transform="rotate(-30 440 180)" fill="#ffffff" opacity="0.75"/>
  <circle cx="435" cy="170" r="8" fill="#ffffff"/>

  <!-- Reflexo de Borda (Rim Light) na curva inferior direita -->
  <path d="M720 540 C755 640 735 740 680 810 C745 740 765 630 730 520 Z" fill="#38d4ff" opacity="0.45"/>
</g>

<!-- Cabeça e Face -->
<g id="head" class="part-head">
  <!-- Sobrancelhas Arqueadas Expressivas -->
  <g id="left-eyebrow" class="part-eyebrow">
    <path d="M360 330 Q425 295 480 335" fill="none" stroke="#0454b0" stroke-width="14" stroke-linecap="round"/>
    <path d="M370 332 Q425 303 470 337" fill="none" stroke="#38c6ff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
  </g>

  <g id="right-eyebrow" class="part-eyebrow">
    <path d="M575 315 Q635 285 690 320" fill="none" stroke="#0454b0" stroke-width="14" stroke-linecap="round"/>
    <path d="M585 317 Q635 293 680 322" fill="none" stroke="#38c6ff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
  </g>

  <!-- Olho Esquerdo (Grande, Cartoon Pixar, Vivo) -->
  <g id="left-eye" class="part-eye">
    <!-- Contorno escuro da órbita -->
    <ellipse cx="430" cy="425" rx="76" ry="92" fill="#021836"/>
    <!-- Esclera branca brilhante -->
    <ellipse cx="430" cy="425" rx="71" ry="87" fill="url(#embasa_eye_sclera)"/>
    <!-- Sombra suave na pálpebra superior -->
    <path d="M365 410 C380 365 480 365 495 410 C465 385 395 385 365 410 Z" fill="#b9daf8" opacity="0.7"/>

    <!-- Pupila e Íris com Rastreamento de Mouse (Left Pupil) -->
    <g id="left-pupil" class="part-pupil">
      <!-- Íris Azul Vibrante -->
      <circle cx="438" cy="430" r="48" fill="url(#embasa_eye_iris)"/>
      <!-- Pupila Preta -->
      <circle cx="438" cy="430" r="32" fill="#010a1c"/>
      <!-- Crescente de Reflexo Azul Claro na base da íris -->
      <path d="M405 445 A38 38 0 0 0 471 445 A34 34 0 0 1 415 440 Z" fill="#38d4ff"/>
      <!-- Brilhos Estelares (Dual Specular Sparkles) -->
      <circle cx="424" cy="408" r="14" fill="#ffffff"/>
      <circle cx="454" cy="448" r="6.5" fill="#ffffff" opacity="0.9"/>
    </g>
  </g>

  <!-- Olho Direito (Grande, Cartoon Pixar, Vivo) -->
  <g id="right-eye" class="part-eye">
    <!-- Contorno escuro da órbita -->
    <ellipse cx="640" cy="405" rx="76" ry="92" fill="#021836"/>
    <!-- Esclera branca brilhante -->
    <ellipse cx="640" cy="405" rx="71" ry="87" fill="url(#embasa_eye_sclera)"/>
    <!-- Sombra suave na pálpebra superior -->
    <path d="M575 390 C590 345 690 345 705 390 C675 365 605 365 575 390 Z" fill="#b9daf8" opacity="0.7"/>

    <!-- Pupila e Íris com Rastreamento de Mouse (Right Pupil) -->
    <g id="right-pupil" class="part-pupil">
      <!-- Íris Azul Vibrante -->
      <circle cx="632" cy="410" r="48" fill="url(#embasa_eye_iris)"/>
      <!-- Pupila Preta -->
      <circle cx="632" cy="410" r="32" fill="#010a1c"/>
      <!-- Crescente de Reflexo Azul Claro na base da íris -->
      <path d="M599 425 A38 38 0 0 0 665 425 A34 34 0 0 1 609 420 Z" fill="#38d4ff"/>
      <!-- Brilhos Estelares (Dual Specular Sparkles) -->
      <circle cx="618" cy="388" r="14" fill="#ffffff"/>
      <circle cx="648" cy="428" r="6.5" fill="#ffffff" opacity="0.9"/>
    </g>
  </g>

  <!-- Bochechas Coradas Fofas -->
  <ellipse cx="340" cy="485" rx="26" ry="15" fill="#38bdf8" opacity="0.45" filter="url(#embasa_soft_blur)"/>
  <ellipse cx="710" cy="465" rx="26" ry="15" fill="#38bdf8" opacity="0.45" filter="url(#embasa_soft_blur)"/>

  <!-- Boca Alegre e Aberta (Sorriso com Dentes e Língua) -->
  <g id="mouth" class="part-mouth">
    <!-- Contorno externo e fundo escuro da cavidade bucal -->
    <path d="M440 500 C470 488 590 482 630 495 C640 540 610 610 535 615 C460 620 430 550 440 500 Z" fill="#021432"/>
    <path d="M444 504 C472 492 588 486 626 499 C634 538 606 604 535 609 C464 614 436 548 444 504 Z" fill="url(#embasa_mouth_inside)"/>

    <!-- Dentes Brancos Alinhados no Topo -->
    <path d="M455 504 C485 500 585 496 615 505 C605 528 465 528 455 504 Z" fill="#ffffff"/>

    <!-- Língua Rosada Suave -->
    <path d="M490 575 C520 540 560 540 590 575 C575 605 510 605 490 575 Z" fill="url(#embasa_tongue_grad)"/>

    <!-- Cantinhos do Sorriso Cartoon -->
    <path d="M435 505 Q442 498 448 506" fill="none" stroke="#0454b0" stroke-width="5" stroke-linecap="round"/>
    <path d="M635 500 Q628 493 622 501" fill="none" stroke="#0454b0" stroke-width="5" stroke-linecap="round"/>
  </g>
</g>

<!-- Ribbon Frontal (Passando na Frente da Cintura com Cores Oficiais da Embasa) -->
<g id="ribbon" class="part-ribbon">
  <!-- Sombra projetada da fita na barriga da gota -->
  <path d="M250 635 C380 685 640 690 770 590 C755 615 625 725 350 670 Z" fill="#011e4d" opacity="0.38" filter="url(#embasa_soft_blur)"/>

  <!-- Faixa 1: Verde Embasa (#8be22e) -->
  <path d="M235 620 C360 670 630 670 780 570 L772 590 C625 688 365 688 245 640 Z" fill="url(#embasa_ribbon_green)"/>

  <!-- Faixa 2: Amarelo Sol (#fff752) -->
  <path d="M245 640 C365 688 625 688 772 590 L764 610 C620 706 370 706 255 660 Z" fill="url(#embasa_ribbon_yellow)"/>

  <!-- Faixa 3: Laranja Quente (#ff911a) -->
  <path d="M255 660 C370 706 620 706 764 610 L756 630 C615 724 375 724 265 680 Z" fill="url(#embasa_ribbon_orange)"/>

  <!-- Faixa 4: Ciano Água (#38d4ff) -->
  <path d="M265 680 C375 724 615 724 756 630 L748 650 C610 742 380 742 275 700 Z" fill="url(#embasa_ribbon_cyan)"/>

  <!-- Faixa 5: Azul Royal (#0277bd) -->
  <path d="M275 700 C380 742 610 742 748 650 L740 670 C605 760 385 760 285 720 Z" fill="url(#embasa_ribbon_blue)"/>
</g>

<!-- Braço Direito (Frente / Correndo / Acenando) -->
<g id="right-arm" class="part-arm">
  <!-- Braço direito flexionado com energia -->
  <path d="M720 520 C780 470 840 430 890 410 C915 400 930 420 915 445 C875 480 810 540 740 560 Z" fill="url(#embasa_limb_grad)"/>
  <!-- Mão direita fofa com 4 dedos e joinha / aceno -->
  <g id="right-hand" class="part-hand">
    <circle cx="910" cy="415" r="26" fill="url(#embasa_limb_grad)"/>
    <circle cx="895" cy="385" r="14" fill="url(#embasa_limb_grad)"/>
    <circle cx="925" cy="390" r="12" fill="url(#embasa_limb_grad)"/>
    <circle cx="935" cy="415" r="11" fill="url(#embasa_limb_grad)"/>
    <circle cx="905" cy="410" r="12" fill="#99e8ff" opacity="0.6"/>
  </g>
</g>

<!-- Gotículas d'Água Alegres e Espirros (Water Droplets Splash) -->
<g id="water-droplets" class="part-droplets">
  <!-- Gotícula 1 (Alto à esquerda) -->
  <path d="M220 380 C210 395 200 415 200 425 C200 440 215 450 230 440 C245 430 240 405 220 380 Z" fill="url(#embasa_limb_grad)"/>
  <circle cx="218" cy="422" r="5" fill="#ffffff" opacity="0.8"/>

  <!-- Gotícula 2 (Perto da mão direita) -->
  <path d="M840 330 C845 345 855 360 855 370 C855 380 845 390 835 385 C820 380 825 355 840 330 Z" fill="url(#embasa_limb_grad)"/>
  <circle cx="842" cy="365" r="4" fill="#ffffff" opacity="0.85"/>

  <!-- Gotícula 3 (Próxima ao pé esquerdo) -->
  <circle cx="280" cy="850" r="14" fill="url(#embasa_limb_grad)"/>
  <circle cx="276" cy="846" r="4.5" fill="#ffffff" opacity="0.9"/>

  <!-- Gotícula 4 (Próxima ao pé direito) -->
  <circle cx="750" cy="880" r="16" fill="url(#embasa_limb_grad)"/>
  <circle cx="745" cy="875" r="5" fill="#ffffff" opacity="0.9"/>

  <!-- Gotícula 5 (Pequena faísca) -->
  <circle cx="780" cy="530" r="9" fill="#38c6ff"/>
  <circle cx="778" cy="528" r="3" fill="#ffffff"/>
</g>
`;

export const EMBASA_PARTS = EMBASA_INNER_SVG;
