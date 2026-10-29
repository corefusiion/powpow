import { GroundFollowerEngine, type AvatarType, type FollowerRenderData, type Particle } from './groundFollowerEngine';

/**
 * GroundFollowerView - Componente de Interface e Cena Interativa
 *
 * Renderiza o Mascote 2D Articulado e a Gota Embasa no "Chão" da aplicação,
 * reagindo dinamicamente ao mouse com aceleração, frenagem com poeira/água,
 * apontamento de botão, pulo físico, pirueta 360° e tontura com estrelas/bolhas.
 */
export class GroundFollowerView {
  public root: HTMLDivElement;
  private canvasEl: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private avatarWrapper: HTMLDivElement;
  private shadowEl: HTMLDivElement;
  private mascotContainer: HTMLDivElement;
  private engine: GroundFollowerEngine;
  private currentType: AvatarType = 'embasa';

  // Elementos de UI
  private mainButton: HTMLButtonElement;
  private demoToggleBtn: HTMLButtonElement;
  private avatarToggleBtn: HTMLButtonElement;
  private ghostCursorEl: HTMLDivElement;
  private dizzyFxEl: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'ground-follower-scene';
    this.root.style.cssText = `
      position: relative;
      width: 100%;
      height: 480px;
      background: radial-gradient(circle at 50% 12%, rgba(226, 162, 59, 0.12) 0%, #0b0b0d 68%);
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      user-select: none;
      font-family: 'Inter', system-ui, sans-serif;
    `;

    // 1. Cabeçalho Estilizado (conforme o prompt)
    const headerEl = document.createElement('div');
    headerEl.style.cssText = `
      position: absolute;
      top: 24px;
      left: 0;
      right: 0;
      text-align: center;
      pointer-events: none;
      z-index: 10;
    `;
    headerEl.innerHTML = `
      <div style="font-family:'JetBrains Mono', monospace; font-size:11px; font-weight:600; color:#E2A23B; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:6px;">
        POWPOW · COMPANHIA INTERATIVA
      </div>
      <h2 style="font-size:26px; font-weight:800; color:#f3efe7; letter-spacing:-0.04em; margin-bottom:6px;">
        Um amigo para o seu <span style="color:#E2A23B;">cursor</span>.
      </h2>
      <p style="font-size:13px; color:rgba(243, 239, 231, 0.62); max-width:540px; margin:0 auto 16px; line-height:1.4;">
        Acelera, corre, freia, senta quando o cursor para, aponta para o botão, pula ao clicar e dá pirueta com tontura ao ser tocado!
      </p>
    `;
    this.root.appendChild(headerEl);

    // 2. Chão nos 24% inferiores
    const floorEl = document.createElement('div');
    floorEl.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 24%;
      background: #141418;
      border-top: 2.5px solid #E2A23B;
      box-shadow: 0 6px 24px rgba(226, 162, 59, 0.18);
      z-index: 2;
      overflow: hidden;
    `;
    // Linhas verticais do chão a cada 64px
    floorEl.innerHTML = `
      <div style="position:absolute; inset:0; background:repeating-linear-gradient(90deg, transparent, transparent 63px, rgba(243,239,231,0.045) 63px, rgba(243,239,231,0.045) 64px);"></div>
      <div style="position:absolute; bottom:8px; right:16px; font-family:'JetBrains Mono', monospace; font-size:10px; color:rgba(243,239,231,0.38); letter-spacing:0.06em;">
        Chão · ele segue você
      </div>
    `;
    this.root.appendChild(floorEl);

    // 3. Botão Adesivo Interativo ("Dar um oi")
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      position: absolute;
      top: 140px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 15;
      display: flex;
      gap: 16px;
      align-items: center;
    `;

    this.mainButton = document.createElement('button');
    this.mainButton.textContent = 'Dar um oi 👋';
    this.mainButton.style.cssText = `
      background: #E2A23B;
      color: #0b0b0d;
      font-weight: 800;
      font-size: 14px;
      padding: 10px 24px;
      border-radius: 9999px;
      border: 2.5px solid #f3efe7;
      box-shadow: 5px 5px 0 #f3efe7;
      cursor: pointer;
      outline: none;
      transition: transform 0.08s ease, box-shadow 0.08s ease;
    `;
    this.mainButton.addEventListener('mousedown', () => {
      this.mainButton.style.transform = 'translate(3px, 3px)';
      this.mainButton.style.boxShadow = '2px 2px 0 #f3efe7';
    });
    this.mainButton.addEventListener('mouseup', () => {
      this.mainButton.style.transform = 'translate(0, 0)';
      this.mainButton.style.boxShadow = '5px 5px 0 #f3efe7';
    });
    this.mainButton.addEventListener('click', () => {
      this.engine.triggerButtonJump();
    });

    // Seletor de Avatar
    this.avatarToggleBtn = document.createElement('button');
    this.avatarToggleBtn.textContent = 'Alternar: 💧 Gota Embasa';
    this.avatarToggleBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.08);
      color: #f3efe7;
      font-weight: 600;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    this.avatarToggleBtn.addEventListener('click', () => {
      this.currentType = this.currentType === 'embasa' ? 'vault' : 'embasa';
      this.avatarToggleBtn.textContent = this.currentType === 'embasa' ? 'Alternar: 💧 Gota Embasa' : 'Alternar: 🦴 Mascote 2D';
      this.engine.setAvatarType(this.currentType);
      this.renderMascotDOM();
    });

    // Botão Modo Demonstração
    this.demoToggleBtn = document.createElement('button');
    this.demoToggleBtn.textContent = '▶ Modo Demo';
    this.demoToggleBtn.style.cssText = `
      background: rgba(226, 162, 59, 0.15);
      color: #E2A23B;
      font-weight: 600;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 9999px;
      border: 1px solid #E2A23B;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    this.demoToggleBtn.addEventListener('click', () => {
      this.engine.isDemoMode = !this.engine.isDemoMode;
      this.demoToggleBtn.textContent = this.engine.isDemoMode ? '⏹ Parar Demo' : '▶ Modo Demo';
    });

    btnContainer.appendChild(this.mainButton);
    btnContainer.appendChild(this.avatarToggleBtn);
    btnContainer.appendChild(this.demoToggleBtn);
    this.root.appendChild(btnContainer);

    // 4. Cursor Fantasma (visível no Modo Demo)
    this.ghostCursorEl = document.createElement('div');
    this.ghostCursorEl.style.cssText = `
      position: absolute;
      width: 22px;
      height: 22px;
      background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23E2A23B" stroke="%23ffffff" stroke-width="2"><path d="M3 3l7 18 3-7 7-3L3 3z"/></svg>') no-repeat center;
      pointer-events: none;
      z-index: 100;
      display: none;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));
    `;
    this.root.appendChild(this.ghostCursorEl);

    // 5. Canvas de Partículas (Poeira e Respingos de Água)
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 4;
    `;
    this.root.appendChild(this.canvasEl);
    this.ctx = this.canvasEl.getContext('2d')!;

    // 6. Wrapper do Mascote e Sombra
    this.avatarWrapper = document.createElement('div');
    this.avatarWrapper.style.cssText = `
      position: absolute;
      width: 120px;
      height: 140px;
      z-index: 5;
      transform-origin: 50% 100%;
      cursor: pointer;
    `;
    this.avatarWrapper.setAttribute('role', 'button');
    this.avatarWrapper.setAttribute('aria-label', 'Mascote interativo');
    this.avatarWrapper.setAttribute('tabindex', '0');

    // Ao clicar ou pressionar Enter/Espaço no mascote: dá pirueta e tontura
    this.avatarWrapper.addEventListener('click', () => {
      this.engine.triggerSpin();
    });
    this.avatarWrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.engine.triggerSpin();
      }
    });

    // Sombra oval no chão
    this.shadowEl = document.createElement('div');
    this.shadowEl.style.cssText = `
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 84px;
      height: 14px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.45);
      filter: blur(2px);
      pointer-events: none;
    `;
    this.avatarWrapper.appendChild(this.shadowEl);

    // Container visual do mascote (SVG dinâmico)
    this.mascotContainer = document.createElement('div');
    this.mascotContainer.style.cssText = `
      width: 100%;
      height: 100%;
      transform-origin: 50% 95%;
      position: relative;
    `;
    this.avatarWrapper.appendChild(this.mascotContainer);

    // Efeito de Tontura (3 estrelinhas ou bolhinhas orbitais)
    this.dizzyFxEl = document.createElement('div');
    this.dizzyFxEl.style.cssText = `
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 24px;
      pointer-events: none;
      display: none;
    `;
    this.avatarWrapper.appendChild(this.dizzyFxEl);

    this.root.appendChild(this.avatarWrapper);

    // 7. Instanciação do Motor de Física
    const groundY = 480 * 0.76; // Linha de topo dos 24% inferiores (364px)

    this.engine = new GroundFollowerEngine({
      containerWidth: 800,
      groundY,
      avatarWidth: 110,
      avatarHeight: 130,
      type: this.currentType,
      onUpdate: (data) => this.renderEngineFrame(data),
      onEmitParticles: (particles) => this.renderParticles(particles),
    });

    this.renderMascotDOM();
    this.setupListeners();
  }

  public mount(target: HTMLElement) {
    target.appendChild(this.root);
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.engine.start();
  }

  private resizeCanvas() {
    const rect = this.root.getBoundingClientRect();
    this.canvasEl.width = rect.width;
    this.canvasEl.height = rect.height;
    this.engine.setContainerWidth(rect.width);

    // Atualiza a posição do botão para o motor calcular o alvo de apontar
    const btnRect = this.mainButton.getBoundingClientRect();
    this.engine.setButtonTarget({
      x: btnRect.left - rect.left + btnRect.width / 2,
      y: btnRect.top - rect.top,
      width: btnRect.width,
      isHovered: false,
    });
  }

  private setupListeners() {
    // Rastreia ponteiro do mouse
    this.root.addEventListener('pointermove', (e) => {
      const rect = this.root.getBoundingClientRect();
      this.engine.setTarget(e.clientX - rect.left);
    });

    // Detecta hover no botão principal para apontamento (118°)
    this.mainButton.addEventListener('pointerenter', () => {
      const rect = this.root.getBoundingClientRect();
      const btnRect = this.mainButton.getBoundingClientRect();
      this.engine.setButtonTarget({
        x: btnRect.left - rect.left + btnRect.width / 2,
        y: btnRect.top - rect.top,
        width: btnRect.width,
        isHovered: true,
      });
    });

    this.mainButton.addEventListener('pointerleave', () => {
      const rect = this.root.getBoundingClientRect();
      const btnRect = this.mainButton.getBoundingClientRect();
      this.engine.setButtonTarget({
        x: btnRect.left - rect.left + btnRect.width / 2,
        y: btnRect.top - rect.top,
        width: btnRect.width,
        isHovered: false,
      });
    });
  }

  /**
   * Renderiza a estrutura SVG do Mascote selecionado (Gotinha Embasa ou Mascote 2D).
   */
  private renderMascotDOM() {
    this.mascotContainer.innerHTML = '';

    if (this.currentType === 'embasa') {
      // 💧 GOTA EMBASA (2D ANIMADA)
      this.mascotContainer.innerHTML = `
        <svg viewBox="0 0 200 200" style="width:100%; height:100%; overflow:visible;">
          <defs>
            <linearGradient id="gf_embasa_body" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#40c4ff"/>
              <stop offset="65%" stop-color="#00b0ff"/>
              <stop offset="100%" stop-color="#0088cc"/>
            </linearGradient>
          </defs>

          <!-- Corpo Principal Gotinha -->
          <g id="gf-embasa-actor">
            <!-- Perna / Pata Traseira (Esquerda) -->
            <g id="gf-leg-left">
              <ellipse cx="78" cy="180" rx="14" ry="8" fill="#0088cc" stroke="#005580" stroke-width="2.5"/>
              <ellipse cx="76" cy="178" rx="7" ry="3.5" fill="#80d8ff"/>
            </g>
            <!-- Perna / Pata Dianteira (Direita) -->
            <g id="gf-leg-right">
              <ellipse cx="122" cy="180" rx="14" ry="8" fill="#0088cc" stroke="#005580" stroke-width="2.5"/>
              <ellipse cx="120" cy="178" rx="7" ry="3.5" fill="#80d8ff"/>
            </g>

            <!-- Silhueta da Gota com Curva -->
            <path id="gf-gotinha-silhouette"
              d="M100 24 C104 20 114 20 116 28 C118 36 108 44 100 52 C70 82 40 120 40 152 C40 178 66 186 100 186 C134 186 160 178 160 152 C160 120 130 82 100 52 Z"
              fill="url(#gf_embasa_body)" stroke="#005580" stroke-width="3.5" stroke-linejoin="round"/>

            <!-- Brilho Cartunesco Curvo -->
            <path d="M96 38 C74 72 52 110 52 144 C52 164 68 174 88 176"
              fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" opacity="0.65"/>
            <circle cx="98" cy="38" r="3" fill="#ffffff" opacity="0.85"/>

            <!-- Fita Tricolor da Bahia no Peito -->
            <g>
              <path d="M46 154 Q100 176 154 154" fill="none" stroke="#43a047" stroke-width="7" stroke-linecap="round"/>
              <path d="M48 157 Q100 177 152 157" fill="none" stroke="#fbc02d" stroke-width="4" stroke-linecap="round"/>
              <path d="M50 160 Q100 178 150 160" fill="none" stroke="#fb8c00" stroke-width="2.2" stroke-linecap="round"/>
              <ellipse cx="100" cy="168" rx="7" ry="9" fill="#ffffff" stroke="#005580" stroke-width="1.8"/>
              <path d="M100 162 C96 166 94 170 94 172 C94 176 96 177 100 177 C104 177 106 176 106 172 C106 170 104 166 100 162 Z" fill="#00b0ff"/>
            </g>

            <!-- Braço Esquerdo -->
            <g id="gf-arm-left">
              <path d="M48 140 C34 144 26 156 32 166 C36 172 44 168 50 158 Z" fill="#0099e6" stroke="#005580" stroke-width="3"/>
            </g>

            <!-- Braço Direito Articulado (aponta a 118° ou acena) -->
            <g id="gf-arm-right" style="transform-origin: 152px 140px;">
              <path d="M152 140 C166 136 178 126 180 116 C180 108 170 112 164 122 C158 132 154 138 152 140 Z"
                fill="#0099e6" stroke="#005580" stroke-width="3" stroke-linejoin="round"/>
              <circle cx="178" cy="114" r="5" fill="#0099e6" stroke="#005580" stroke-width="2.5"/>
              <circle cx="180" cy="112" r="2.5" fill="#ffffff" opacity="0.9"/>
            </g>

            <!-- Rosto Kawaii -->
            <ellipse cx="62" cy="132" rx="9" ry="5.5" fill="#ff6b8b" opacity="0.5"/>
            <ellipse cx="138" cy="132" rx="9" ry="5.5" fill="#ff6b8b" opacity="0.5"/>
            <path d="M90 136 Q100 148 110 136" fill="#7a001a" stroke="#005580" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M94 140 Q100 147 106 140" fill="#ff5252"/>

            <!-- Olhos Grandes com Esclera e Pupilas Dinâmicas -->
            <g id="gf-eyes-group">
              <ellipse cx="78" cy="114" rx="13" ry="16" fill="#ffffff" stroke="#005580" stroke-width="2"/>
              <ellipse cx="122" cy="114" rx="13" ry="16" fill="#ffffff" stroke="#005580" stroke-width="2"/>
              <!-- Pupilas Móveis -->
              <g id="gf-pupils">
                <ellipse cx="78" cy="114" rx="8.5" ry="11.5" fill="#0a192f"/>
                <path d="M71 117 A7 9 0 0 0 85 117 A6 7.5 0 0 1 72 115 Z" fill="#00e5ff"/>
                <circle cx="75.5" cy="109" r="3.4" fill="#ffffff"/>
                <ellipse cx="122" cy="114" rx="8.5" ry="11.5" fill="#0a192f"/>
                <path d="M115 117 A7 9 0 0 0 129 117 A6 7.5 0 0 1 116 115 Z" fill="#00e5ff"/>
                <circle cx="119.5" cy="109" r="3.4" fill="#ffffff"/>
              </g>
            </g>
          </g>
        </svg>
      `;
    } else {
      // 🦴 MASCOTE 2D ARTICULADO (VAULT)
      this.mascotContainer.innerHTML = `
        <svg viewBox="0 0 200 200" style="width:100%; height:100%; overflow:visible;">
          <g id="gf-vault-actor">
            <!-- Perna Esquerda com Rotação no Quadril -->
            <g id="gf-leg-left" style="transform-origin: 88px 145px;">
              <path d="M86 142 L80 180 L70 186" fill="none" stroke="#1E6BB8" stroke-width="14" stroke-linecap="round"/>
              <ellipse cx="68" cy="186" rx="12" ry="6" fill="#5c4033" stroke="#2b1d0c" stroke-width="2"/>
            </g>
            <!-- Perna Direita -->
            <g id="gf-leg-right" style="transform-origin: 112px 145px;">
              <path d="M114 142 L120 180 L130 186" fill="none" stroke="#1E6BB8" stroke-width="14" stroke-linecap="round"/>
              <ellipse cx="132" cy="186" rx="12" ry="6" fill="#5c4033" stroke="#2b1d0c" stroke-width="2"/>
            </g>

            <!-- Tronco & Macacão Azul com Listra Dourada -->
            <path d="M78 95 Q100 88 122 95 L118 145 L82 145 Z" fill="#1E6BB8" stroke="#0f3b68" stroke-width="2.5"/>
            <path d="M96 95 L96 145" stroke="#f1c40f" stroke-width="5" stroke-linecap="round"/>

            <!-- Braço Esquerdo (Apoiado no quadril) -->
            <g id="gf-arm-left" style="transform-origin: 78px 102px;">
              <path d="M78 102 Q60 115 72 135" fill="none" stroke="#1E6BB8" stroke-width="11" stroke-linecap="round"/>
              <circle cx="74" cy="136" r="6" fill="#f8d7b0" stroke="#0f3b68" stroke-width="1.8"/>
            </g>

            <!-- Braço Direito Articulado (Polegar pra Cima ou Apontando a 118°) -->
            <g id="gf-arm-right" style="transform-origin: 122px 102px;">
              <path d="M122 102 Q142 90 148 76" fill="none" stroke="#1E6BB8" stroke-width="11" stroke-linecap="round"/>
              <!-- Mão com Polegar Levanta / Aponta -->
              <circle cx="150" cy="74" r="7" fill="#f8d7b0" stroke="#0f3b68" stroke-width="1.8"/>
              <path d="M150 72 L150 63" stroke="#f8d7b0" stroke-width="4.5" stroke-linecap="round"/>
            </g>

            <!-- Cabeça Cartoon com Cabelo Loiro Clássico -->
            <circle cx="100" cy="65" r="26" fill="#f8d7b0" stroke="#0f3b68" stroke-width="2"/>
            <!-- Topete Loiro -->
            <path d="M74 62 C74 40 92 36 100 36 C115 36 128 46 128 62 C124 55 116 52 106 52 C94 52 86 56 74 62 Z" fill="#f1c40f" stroke="#0f3b68" stroke-width="2"/>
            <!-- Covinha e Sorriso Confiante -->
            <path d="M92 74 Q100 82 110 74" fill="none" stroke="#0f3b68" stroke-width="2" stroke-linecap="round"/>

            <!-- Olhos com Pupilas Dinâmicas -->
            <g id="gf-eyes-group">
              <ellipse cx="91" cy="62" rx="4.5" ry="6" fill="#ffffff" stroke="#0f3b68" stroke-width="1.5"/>
              <ellipse cx="111" cy="62" rx="4.5" ry="6" fill="#ffffff" stroke="#0f3b68" stroke-width="1.5"/>
              <g id="gf-pupils">
                <circle cx="91" cy="62" r="2.8" fill="#0b0b12"/>
                <circle cx="90" cy="61" r="1" fill="#ffffff"/>
                <circle cx="111" cy="62" r="2.8" fill="#0b0b12"/>
                <circle cx="110" cy="61" r="1" fill="#ffffff"/>
              </g>
            </g>
          </g>
        </svg>
      `;
    }

    // Configura o efeito visual de tontura (estrelinhas âmbar/ouro ou bolhas d'água)
    if (this.currentType === 'embasa') {
      this.dizzyFxEl.innerHTML = `
        <div style="font-size:16px; display:flex; justify-content:space-around; animation:gf-orbit 1.2s linear infinite;">
          <span>🫧</span><span>💧</span><span>✨</span>
        </div>
      `;
    } else {
      this.dizzyFxEl.innerHTML = `
        <div style="font-size:16px; display:flex; justify-content:space-around; animation:gf-orbit 1.2s linear infinite;">
          <span>⭐</span><span>💫</span><span>⭐</span>
        </div>
      `;
    }
  }

  /**
   * Recebe os dados de cada frame do motor e aplica transformações ultra-fluidas.
   */
  private renderEngineFrame(data: FollowerRenderData) {
    // 1. Posicionamento Horizontal e Vertical com Salto
    this.avatarWrapper.style.transform = `translate(${data.x - 60}px, ${data.y - 140}px)`;

    // 2. Escala, Direção (flip horizontal), Inclinação e Squash/Stretch
    const flip = data.scaleX;
    this.mascotContainer.style.transform = `
      scale(${flip * data.squashScaleX}, ${data.squashScaleY})
      rotate(${data.tiltAngle}deg)
      rotate(${data.spinAngle}deg)
    `;

    // 3. Sombra proporcional à altura do salto
    this.shadowEl.style.transform = `translateX(-50%) scale(${data.shadowScale})`;
    this.shadowEl.style.opacity = String(data.shadowAlpha);

    // 4. Rotação das Pernas e Elevação do Passo (Foot-planting)
    const legLeft = this.mascotContainer.querySelector<SVGGElement>('#gf-leg-left');
    const legRight = this.mascotContainer.querySelector<SVGGElement>('#gf-leg-right');

    if (legLeft && legRight) {
      legLeft.style.transform = `rotate(${data.legLeftAngle}deg) scaleY(${data.legLeftScaleY})`;
      legRight.style.transform = `rotate(${data.legRightAngle}deg) scaleY(${data.legRightScaleY})`;
    }

    // 5. Batida de pé pela mola quando sentado
    if (data.isSitting && legRight) {
      legRight.style.transform = `translateY(${data.tapFootY}px)`;
    }

    // 6. Braço Apontando para o Botão (118°)
    const armRight = this.mascotContainer.querySelector<SVGGElement>('#gf-arm-right');
    if (armRight) {
      if (data.state === 'pointing') {
        armRight.style.transform = `rotate(${data.armAngle}deg)`;
      } else {
        armRight.style.transform = 'rotate(0deg)';
      }
    }

    // 7. Olhar das pupilas (-1 a 1)
    const pupils = this.mascotContainer.querySelector<SVGGElement>('#gf-pupils');
    if (pupils) {
      pupils.style.transform = `translate(${data.gazeX * 4}px, ${data.gazeY * 3}px)`;
    }

    // 8. Tontura e Estrelinhas
    if (data.isDizzy) {
      this.dizzyFxEl.style.display = 'block';
    } else {
      this.dizzyFxEl.style.display = 'none';
    }

    // 9. Cursor Fantasma no Modo Demo
    if (this.engine.isDemoMode && this.engine.ghostCursor.active) {
      this.ghostCursorEl.style.display = 'block';
      this.ghostCursorEl.style.left = `${this.engine.ghostCursor.x}px`;
      this.ghostCursorEl.style.top = `${this.engine.ghostCursor.y}px`;
    } else {
      this.ghostCursorEl.style.display = 'none';
    }
  }

  /**
   * Renderiza as partículas no chão (poeira ou borrifos de água).
   */
  private renderParticles(particles: Particle[]) {
    this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);

    for (const p of particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      if (p.type === 'water') {
        // Água cyan com brilho
        this.ctx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
        this.ctx.shadowColor = '#00e5ff';
        this.ctx.shadowBlur = 6;
      } else {
        // Poeira suave #f3efe7
        this.ctx.fillStyle = `rgba(243, 239, 231, ${p.alpha})`;
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
      }
      this.ctx.fill();
    }
  }
}
