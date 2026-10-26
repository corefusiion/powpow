// Embasa Mascot 2D Cartoon Edition
// Clean 2D vector art with subtle animations, vibrant Embasa tricolor ribbon,
// large lively cartoon anime eyes with dual sparkles, cheerful smile, and kawaii blushing cheeks.
// Fully compliant with AvatarAPI (18 semantic IDs) in a 1024x1024 viewBox.

export const EMBASA_DEFS = `
<linearGradient id="embasa_2d_body" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#40c4ff"/>
  <stop offset="60%" stop-color="#00b0ff"/>
  <stop offset="100%" stop-color="#0088cc"/>
</linearGradient>

<linearGradient id="embasa_ribbon_green" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#4caf50"/>
  <stop offset="100%" stop-color="#43a047"/>
</linearGradient>

<linearGradient id="embasa_ribbon_yellow" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#ffeb3b"/>
  <stop offset="100%" stop-color="#fbc02d"/>
</linearGradient>

<linearGradient id="embasa_ribbon_orange" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#ffa726"/>
  <stop offset="100%" stop-color="#fb8c00"/>
</linearGradient>

<linearGradient id="embasa_tongue_grad" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stop-color="#ff8da1"/>
  <stop offset="100%" stop-color="#e91e63"/>
</linearGradient>

<filter id="embasa_soft_shadow" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur stdDeviation="10"/>
</filter>
`;

export const EMBASA_GRADIENTS = EMBASA_DEFS;

export const EMBASA_INNER_SVG = `
<!-- Grounding Shadow -->
<ellipse cx="512" cy="940" rx="220" ry="28" fill="#000000" opacity="0.15" filter="url(#embasa_soft_shadow)"/>

<!-- Legs and Feet (Cute cartoon rounded water paws) -->
<g id="left-leg" class="part-leg">
  <path d="M410 740 C390 790 370 840 360 880 C360 910 400 920 430 900 C450 860 460 800 460 740 Z" fill="#0088cc" stroke="#005580" stroke-width="12" stroke-linejoin="round"/>
  <g id="left-foot" class="part-foot">
    <ellipse cx="380" cy="890" rx="55" ry="32" fill="#0088cc" stroke="#005580" stroke-width="12"/>
    <ellipse cx="370" cy="880" rx="28" ry="14" fill="#80d8ff" opacity="0.8"/>
  </g>
</g>

<g id="right-leg" class="part-leg">
  <path d="M614 740 C634 790 654 840 664 880 C664 910 624 920 594 900 C574 860 564 800 564 740 Z" fill="#0088cc" stroke="#005580" stroke-width="12" stroke-linejoin="round"/>
  <g id="right-foot" class="part-foot">
    <ellipse cx="644" cy="890" rx="55" ry="32" fill="#0088cc" stroke="#005580" stroke-width="12"/>
    <ellipse cx="634" cy="880" rx="28" ry="14" fill="#80d8ff" opacity="0.8"/>
  </g>
</g>

<!-- Left Arm (Cute resting arm) -->
<g id="left-arm" class="part-arm">
  <path d="M260 530 C180 550 140 610 170 650 C190 680 230 650 260 610 Z" fill="#0099e6" stroke="#005580" stroke-width="12" stroke-linejoin="round"/>
  <g id="left-hand" class="part-hand">
    <circle cx="160" cy="650" r="30" fill="#0099e6" stroke="#005580" stroke-width="12"/>
    <circle cx="155" cy="645" r="14" fill="#80d8ff" opacity="0.75"/>
  </g>
</g>

<!-- Right Arm (Friendly wave gesture) -->
<g id="right-arm" class="part-arm">
  <path d="M764 530 C840 500 880 430 870 380 C850 350 810 370 780 420 Z" fill="#0099e6" stroke="#005580" stroke-width="12" stroke-linejoin="round"/>
  <g id="right-hand" class="part-hand">
    <circle cx="870" cy="370" r="34" fill="#0099e6" stroke="#005580" stroke-width="12"/>
    <circle cx="885" cy="345" r="16" fill="#0099e6" stroke="#005580" stroke-width="10"/>
    <circle cx="865" cy="365" r="14" fill="#80d8ff" opacity="0.75"/>
  </g>
</g>

<!-- Main Droplet Body (Clean 2D Cartoon Silhouette) -->
<g id="body" class="part-body">
  <path d="M512 90 C535 70 585 70 595 110 C605 150 555 190 512 230 C360 380 210 570 210 730 C210 860 340 900 512 900 C684 900 814 860 814 730 C814 570 664 380 512 230 Z"
    fill="url(#embasa_2d_body)" stroke="#005580" stroke-width="18" stroke-linejoin="round"/>

  <!-- 2D Glossy Highlight Arc -->
  <path d="M490 160 C380 330 270 520 270 690 C270 790 350 840 450 850"
    fill="none" stroke="#ffffff" stroke-width="22" stroke-linecap="round" opacity="0.6"/>
  <circle cx="500" cy="160" r="15" fill="#ffffff" opacity="0.85"/>
</g>

<!-- Face & Head Details -->
<g id="head" class="part-head">
  <!-- Eyebrows -->
  <g id="left-eyebrow" class="part-eyebrow">
    <path d="M350 330 Q405 295 460 330" fill="none" stroke="#005580" stroke-width="14" stroke-linecap="round"/>
  </g>
  <g id="right-eyebrow" class="part-eyebrow">
    <path d="M570 330 Q625 295 680 330" fill="none" stroke="#005580" stroke-width="14" stroke-linecap="round"/>
  </g>

  <!-- Left Eye (Big Cartoon Anime) -->
  <g id="left-eye" class="part-eye">
    <ellipse cx="405" cy="415" rx="65" ry="80" fill="#ffffff" stroke="#005580" stroke-width="12"/>
    <g id="left-pupil" class="part-pupil">
      <ellipse cx="410" cy="420" rx="42" ry="54" fill="#0a192f"/>
      <path d="M375 435 A35 45 0 0 0 445 435 A30 40 0 0 1 385 430 Z" fill="#00e5ff"/>
      <circle cx="395" cy="395" r="15" fill="#ffffff"/>
      <circle cx="430" cy="445" r="7.5" fill="#ffffff" opacity="0.9"/>
    </g>
  </g>

  <!-- Right Eye (Big Cartoon Anime) -->
  <g id="right-eye" class="part-eye">
    <ellipse cx="625" cy="415" rx="65" ry="80" fill="#ffffff" stroke="#005580" stroke-width="12"/>
    <g id="right-pupil" class="part-pupil">
      <ellipse cx="620" cy="420" rx="42" ry="54" fill="#0a192f"/>
      <path d="M585 435 A35 45 0 0 0 655 435 A30 40 0 0 1 595 430 Z" fill="#00e5ff"/>
      <circle cx="605" cy="395" r="15" fill="#ffffff"/>
      <circle cx="640" cy="445" r="7.5" fill="#ffffff" opacity="0.9"/>
    </g>
  </g>

  <!-- Blushing Cheeks (Kawaii) -->
  <ellipse cx="320" cy="505" rx="45" ry="26" fill="#ff6b8b" opacity="0.55"/>
  <ellipse cx="710" cy="505" rx="45" ry="26" fill="#ff6b8b" opacity="0.55"/>

  <!-- Cheerful Smile Mouth -->
  <g id="mouth" class="part-mouth">
    <path d="M435 520 C435 630 595 630 595 520 Z" fill="#0a192f" stroke="#005580" stroke-width="12" stroke-linejoin="round"/>
    <!-- Tongue -->
    <path d="M470 575 C515 545 540 545 565 575 C550 615 485 615 470 575 Z" fill="url(#embasa_tongue_grad)"/>
    <!-- Corner Dimples -->
    <path d="M428 522 Q434 515 440 524" fill="none" stroke="#005580" stroke-width="8" stroke-linecap="round"/>
    <path d="M602 522 Q596 515 590 524" fill="none" stroke="#005580" stroke-width="8" stroke-linecap="round"/>
  </g>
</g>

<!-- Embasa Tricolor Ribbon Across Waist -->
<g id="ribbon" class="part-ribbon">
  <!-- Green Ribbon Stripe -->
  <path d="M240 735 Q512 850 784 735" fill="none" stroke="url(#embasa_ribbon_green)" stroke-width="36" stroke-linecap="round"/>
  <!-- Yellow Ribbon Stripe -->
  <path d="M250 750 Q512 860 774 750" fill="none" stroke="url(#embasa_ribbon_yellow)" stroke-width="20" stroke-linecap="round"/>
  <!-- Orange Ribbon Stripe -->
  <path d="M260 762 Q512 868 764 762" fill="none" stroke="url(#embasa_ribbon_orange)" stroke-width="10" stroke-linecap="round"/>

  <!-- Center Water Droplet Emblem Badge -->
  <ellipse cx="512" cy="815" rx="36" ry="44" fill="#ffffff" stroke="#005580" stroke-width="10"/>
  <path d="M512 785 C495 805 485 825 485 835 C485 850 495 858 512 858 C529 858 539 850 539 835 C539 825 529 805 512 785 Z" fill="#00b0ff"/>
</g>

<!-- Ambient Water Magic Pearls -->
<g id="water-droplets" class="part-droplets">
  <circle cx="180" cy="380" r="16" fill="#80d8ff" stroke="#005580" stroke-width="6"/>
  <circle cx="174" cy="374" r="5" fill="#ffffff"/>
  <circle cx="840" cy="280" r="20" fill="#80d8ff" stroke="#005580" stroke-width="6"/>
  <circle cx="832" cy="272" r="7" fill="#ffffff"/>
</g>
`;

export const EMBASA_PARTS = EMBASA_INNER_SVG;
