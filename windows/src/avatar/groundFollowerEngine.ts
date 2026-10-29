/**
 * GroundFollowerEngine - Motor de Física Procedural & Animação Comportamental
 *
 * Implementa 100% das regras físicas e comportamentais do prompt:
 * 1. Perseguição horizontal com aceleração (1800 px/s²), freio (2700 px/s²), vMax (620 px/s).
 * 2. Frenagem preditiva pela fórmula d_brake = v² / (2 * freio).
 * 3. Ciclo de passada com foot-planting avançando pela distância real percorrida (dx).
 * 4. Antecipação (-7° por 150ms), inclinação de corrida (+10°/+16°) e recuo de frenagem (-9°).
 * 5. Partículas dinâmicas no chão: nuvens de poeira para Vault e borrifos de água para Embasa.
 * 6. Repouso/Senta após 1.9s com batida de pé amortecida por mola (stiffness 70, damping 11).
 * 7. Apontamento ao botão principal (118°) quando o cursor se aproxima.
 * 8. Salto com squash prévio (90ms, -16%), velocidade inicial 560 px/s, gravidade 1900 px/s²,
 *    e amasso de pouso (-22%) recuperado por mola (stiffness 380, damping 14).
 * 9. Pirueta 360° em 700ms + 1.6s de tontura (balanço ±7° com 3 partículas orbitando a cabeça).
 * 10. Modo demonstração (ciclo de 12s) com cursor fantasma autônomo.
 */

export type AvatarType = 'embasa' | 'vault';

export type FollowerState =
  | 'idle'
  | 'anticipating'
  | 'running'
  | 'braking'
  | 'sitting'
  | 'pointing'
  | 'squashing'
  | 'jumping'
  | 'spinning'
  | 'dizzy';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'dust' | 'water';
}

export class DampedSpring {
  pos: number = 0;
  vel: number = 0;
  target: number = 0;

  constructor(
    public stiffness: number,
    public damping: number,
  ) {}

  update(dt: number): number {
    const force = -this.stiffness * (this.pos - this.target) - this.damping * this.vel;
    this.vel += force * dt;
    this.pos += this.vel * dt;
    return this.pos;
  }

  reset(pos: number = 0, vel: number = 0) {
    this.pos = pos;
    this.vel = vel;
    this.target = 0;
  }
}

export interface FollowerOptions {
  containerWidth: number;
  groundY: number; // Posição vertical do chão (px)
  avatarWidth: number;
  avatarHeight: number;
  type: AvatarType;
  onUpdate: (data: FollowerRenderData) => void;
  onEmitParticles?: (particles: Particle[]) => void;
}

export interface FollowerRenderData {
  x: number;
  y: number;
  scaleX: number; // 1 ou -1 para direção
  tiltAngle: number; // Inclinação do corpo (graus)
  bodyBob: number; // Oscilação vertical do passo (px)
  legLeftAngle: number; // Rotação perna esquerda (graus)
  legRightAngle: number; // Rotação perna direita (graus)
  legLeftScaleY: number; // Encolhimento perna no ar
  legRightScaleY: number;
  armAngle: number; // Rotação do braço (graus)
  jumpY: number; // Deslocamento vertical do salto
  squashScaleX: number; // Squash & stretch X
  squashScaleY: number; // Squash & stretch Y
  shadowScale: number; // Escala da sombra proporcional à altura
  shadowAlpha: number; // Opacidade da sombra
  spinAngle: number; // Rotação da pirueta
  dizzyAngle: number; // Balanço da tontura
  isSitting: boolean;
  isDizzy: boolean;
  tapFootY: number; // Batida do pé pela mola
  gazeX: number; // Olhar horizontal normalizado (-1 a 1)
  gazeY: number; // Olhar vertical normalizado (-1 a 1)
  state: FollowerState;
}

export class GroundFollowerEngine {
  private containerWidth: number;
  private groundY: number;
  private avatarWidth: number;
  private avatarHeight: number;
  private avatarType: AvatarType;

  // Posição e velocidade horizontais
  public x: number = 100;
  public vx: number = 0;
  public targetX: number = 100;
  public facing: number = 1; // 1 = direita, -1 = esquerda

  // Físicas constantes do prompt
  private readonly ACCEL: number = 1800; // px/s²
  private readonly BRAKE: number = 2700; // px/s²
  private readonly MAX_SPEED: number = 620; // px/s
  private readonly GRAVITY: number = 1900; // px/s²
  private readonly JUMP_V0: number = -560; // px/s

  // Estado e timers
  public state: FollowerState = 'idle';
  private idleTime: number = 0;
  private anticipateTime: number = 0;
  private squashTime: number = 0;
  private spinTime: number = 0;
  private dizzyTime: number = 0;

  // Pulo & Molas
  private jumpY: number = 0;
  private jumpVy: number = 0;
  private landingSpring: DampedSpring = new DampedSpring(380, 14);
  private footSpring: DampedSpring = new DampedSpring(70, 11);
  private nextFootTapTime: number = 0;

  // Passadas (foot-planting baseado em distância dx)
  private stepPhase: number = 0;
  private readonly STEP_CYCLE: number = 4 * 24 * Math.sin((24 * Math.PI) / 180); // 39.04 px por ciclo completo

  // Partículas
  public particles: Particle[] = [];
  private dustCooldown: number = 0;

  // Modo demonstração
  public isDemoMode: boolean = false;
  private demoTime: number = 0;
  public ghostCursor: { x: number; y: number; active: boolean } = { x: 0, y: 0, active: false };

  // Botão alvo de apontamento
  public buttonTarget: { x: number; y: number; width: number; isHovered: boolean } | null = null;

  // Callback de render
  private onUpdate: (data: FollowerRenderData) => void;
  private onEmitParticles?: (particles: Particle[]) => void;

  private rafId: number | null = null;
  private lastTime: number = 0;
  private isPaused: boolean = false;

  constructor(options: FollowerOptions) {
    this.containerWidth = options.containerWidth;
    this.groundY = options.groundY;
    this.avatarWidth = options.avatarWidth;
    this.avatarHeight = options.avatarHeight;
    this.avatarType = options.type;
    this.onUpdate = options.onUpdate;
    this.onEmitParticles = options.onEmitParticles;
    this.x = options.containerWidth * 0.25;
    this.targetX = this.x;
  }

  public setAvatarType(type: AvatarType) {
    this.avatarType = type;
  }

  public setContainerWidth(width: number) {
    this.containerWidth = width;
  }

  public setTarget(x: number) {
    this.targetX = Math.max(this.avatarWidth * 0.5, Math.min(this.containerWidth - this.avatarWidth * 0.5, x));
    // Se o usuário interagiu, pausa o demo
    if (this.isDemoMode) {
      this.isDemoMode = false;
      this.ghostCursor.active = false;
    }
  }

  public setButtonTarget(btn: { x: number; y: number; width: number; isHovered: boolean } | null) {
    this.buttonTarget = btn;
  }

  public start() {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isPaused = true;
  }

  /**
   * Gatilho de clique no botão principal: agacha 90ms (-16%), pula e pousa elástico.
   */
  public triggerButtonJump() {
    if (this.state === 'jumping' || this.state === 'spinning') return;
    this.state = 'squashing';
    this.squashTime = 0.09; // 90ms
  }

  /**
   * Gatilho de clique no próprio mascote: pirueta 360° em 700ms + 1.6s de tontura com estrelinhas.
   */
  public triggerSpin() {
    if (this.state === 'spinning') return;
    this.state = 'spinning';
    this.spinTime = 0.7; // 700ms
    this.dizzyTime = 1.6; // 1.6s de tontura após o giro
  }

  /**
   * Loop principal em requestAnimationFrame.
   */
  private loop = (time: number) => {
    if (this.isPaused) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.064); // Clamped a 15 FPS min para evitar saltos
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // 1. Atualização do Modo Demo (ciclo de 12s)
    if (this.isDemoMode) {
      this.updateDemoCycle(dt);
    }

    // 2. Atualização das Molas
    this.landingSpring.update(dt);
    this.footSpring.update(dt);

    // 3. Atualização das Partículas (poeira ou água)
    this.updateParticles(dt);

    // 4. Pirueta e Tontura
    if (this.state === 'spinning') {
      this.spinTime -= dt;
      if (this.spinTime <= 0) {
        this.state = 'dizzy';
      }
      return;
    }

    if (this.state === 'dizzy') {
      this.dizzyTime -= dt;
      if (this.dizzyTime <= 0) {
        this.state = 'idle';
      }
      return;
    }

    // 5. Ciclo de Salto (Squash prévio -> Gravidade -> Impacto)
    if (this.state === 'squashing') {
      this.squashTime -= dt;
      if (this.squashTime <= 0) {
        this.state = 'jumping';
        this.jumpVy = this.JUMP_V0;
      }
      return;
    }

    if (this.state === 'jumping') {
      this.jumpY += this.jumpVy * dt;
      this.jumpVy += this.GRAVITY * dt;

      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.jumpVy = 0;
        this.state = 'idle';
        // Impacto de pouso: amassa 22% (-0.22) e volta pela mola
        this.landingSpring.reset(-0.22, 0);
        this.emitImpactParticles();
      }
      return;
    }

    // 6. Alvo e Distância
    // Para a 1/3 da própria largura antes do cursor
    const stopOffset = (this.avatarWidth / 3) * this.facing;
    let effectiveTargetX = this.targetX - stopOffset;

    // Se houver botão com foco/hover, o alvo passa a ser ao lado dele
    if (this.buttonTarget && this.buttonTarget.isHovered) {
      effectiveTargetX = this.buttonTarget.x - this.avatarWidth * 0.7;
    }

    const distToTarget = effectiveTargetX - this.x;
    const absDist = Math.abs(distToTarget);

    // Atualiza direção para onde o mascote está olhando
    if (absDist > 12) {
      this.facing = distToTarget > 0 ? 1 : -1;
    }

    // Distância de frenagem: d_brake = v² / (2 * freio)
    const brakeDist = (this.vx * this.vx) / (2 * this.BRAKE);

    // 7. Máquina de Estados de Movimento
    if (absDist > 6) {
      this.idleTime = 0;

      // Antecipação: se o cursor estiver a mais de 260px com ele parado, inclina 7° para trás por 150ms
      if (this.state === 'idle' && absDist > 260 && this.anticipateTime <= 0) {
        this.state = 'anticipating';
        this.anticipateTime = 0.15; // 150ms
      }

      if (this.state === 'anticipating') {
        this.anticipateTime -= dt;
        if (this.anticipateTime <= 0) {
          this.state = 'running';
        }
        return;
      }

      // Frenagem ou Aceleração
      if (absDist <= brakeDist + 15) {
        this.state = 'braking';
        // Desacelera forte
        const decel = this.BRAKE * dt;
        if (Math.abs(this.vx) <= decel) {
          this.vx = 0;
        } else {
          this.vx -= Math.sign(this.vx) * decel;
        }
        // Solta nuvens de poeira / gotículas na freada forte
        this.dustCooldown -= dt;
        if (this.dustCooldown <= 0 && Math.abs(this.vx) > 180) {
          this.emitBrakingParticles();
          this.dustCooldown = 0.08;
        }
      } else {
        this.state = 'running';
        // Acelera na direção do alvo
        const dir = Math.sign(distToTarget);
        this.vx += dir * this.ACCEL * dt;
        // Limita à velocidade máxima
        this.vx = Math.max(-this.MAX_SPEED, Math.min(this.MAX_SPEED, this.vx));
      }

      // Aplica deslocamento
      const dx = this.vx * dt;
      this.x += dx;

      // Avança a fase da passada com a distância real percorrida dx!
      this.stepPhase += Math.abs(dx) / this.STEP_CYCLE;
    } else {
      // Parado
      this.vx = 0;
      this.idleTime += dt;

      // Verifica se está apontando para o botão
      if (this.buttonTarget && this.buttonTarget.isHovered) {
        this.state = 'pointing';
      } else if (this.idleTime >= 1.9) {
        // Cursor parado por mais de 1.9s: senta
        this.state = 'sitting';

        // Bate o pé da frente de vez em quando com mola
        if (this.idleTime > this.nextFootTapTime) {
          this.footSpring.reset(-8, 30); // Impulso no pé
          this.nextFootTapTime = this.idleTime + 1.2 + Math.random() * 1.5;
        }
      } else {
        this.state = 'idle';
      }
    }

    // Trava nos limites da tela
    this.x = Math.max(this.avatarWidth * 0.4, Math.min(this.containerWidth - this.avatarWidth * 0.4, this.x));
  }

  /**
   * Emite nuvens de poeira (Vault) ou borrifos de água (Embasa) durante a freada.
   */
  private emitBrakingParticles() {
    const footX = this.x - this.facing * 18;
    const footY = this.groundY;

    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: footX + (Math.random() - 0.5) * 16,
        y: footY - 2,
        vx: -this.facing * (40 + Math.random() * 70),
        vy: -20 - Math.random() * 30, // sobem até 14px
        radius: 3,
        maxRadius: 7 + Math.random() * 4,
        alpha: 0.6,
        life: 0,
        maxLife: 0.52, // 520ms
        type: this.avatarType === 'embasa' ? 'water' : 'dust',
      });
    }
  }

  /**
   * Emite partículas de impacto no pouso do salto.
   */
  private emitImpactParticles() {
    const footX = this.x;
    const footY = this.groundY;

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI - Math.PI; // Leque radial
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x: footX,
        y: footY - 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        radius: 3,
        maxRadius: 8,
        alpha: 0.7,
        life: 0,
        maxLife: 0.45,
        type: this.avatarType === 'embasa' ? 'water' : 'dust',
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const progress = p.life / p.maxLife;
      p.radius = 3 + (p.maxRadius - 3) * progress;
      p.alpha = 0.6 * (1 - progress);
    }

    if (this.onEmitParticles) {
      this.onEmitParticles(this.particles);
    }
  }

  /**
   * Ciclo autônomo do Modo Demonstração (12s):
   * 0-3s: Persegue cursor fantasma da esquerda para a direita e freia
   * 3-5s: Fica parado e senta
   * 5-7.5s: Vai até o botão e aponta
   * 7.5-9s: Clica no botão e pula
   * 9-11.5s: Clica no mascote (pirueta 360° e tontura)
   * 11.5-12s: Retorna ao início
   */
  private updateDemoCycle(dt: number) {
    this.demoTime = (this.demoTime + dt) % 12;
    this.ghostCursor.active = true;

    if (this.demoTime < 3) {
      // 0 a 3s: Corre da esquerda para a direita
      const t = this.demoTime / 3;
      this.ghostCursor.x = this.containerWidth * (0.2 + 0.6 * t);
      this.ghostCursor.y = this.groundY - 60;
      this.targetX = this.ghostCursor.x;
    } else if (this.demoTime < 5) {
      // 3 a 5s: Fica parado
      this.ghostCursor.x = this.containerWidth * 0.8;
      this.ghostCursor.y = this.groundY - 60;
      this.targetX = this.ghostCursor.x;
    } else if (this.demoTime < 7.5) {
      // 5 a 7.5s: Vai até o botão e aponta
      if (this.buttonTarget) {
        this.ghostCursor.x = this.buttonTarget.x;
        this.ghostCursor.y = this.buttonTarget.y;
        this.buttonTarget.isHovered = true;
      }
    } else if (this.demoTime < 9) {
      // 7.5 a 9s: Clica e pula
      if (this.state !== 'jumping' && this.state !== 'squashing' && this.demoTime < 7.7) {
        this.triggerButtonJump();
      }
    } else if (this.demoTime < 11.5) {
      // 9 a 11.5s: Pirueta e tontura
      if (this.buttonTarget) this.buttonTarget.isHovered = false;
      this.ghostCursor.x = this.x;
      this.ghostCursor.y = this.groundY - this.avatarHeight * 0.5;
      if (this.state !== 'spinning' && this.state !== 'dizzy' && this.demoTime < 9.2) {
        this.triggerSpin();
      }
    }
  }

  /**
   * Calcula todos os parâmetros visuais e entrega ao callback de render.
   */
  private render() {
    let tiltAngle = 0;
    let bodyBob = 0;
    let legLeftAngle = 0;
    let legRightAngle = 0;
    let legLeftScaleY = 1;
    let legRightScaleY = 1;
    let armAngle = 0;
    let squashScaleX = 1;
    let squashScaleY = 1;
    let spinAngle = 0;
    let dizzyAngle = 0;
    let tapFootY = 0;

    // 1. Inclinação (Tilt)
    if (this.state === 'anticipating') {
      // Inclina 7° para trás na antecipação
      tiltAngle = -7 * this.facing;
    } else if (this.state === 'running') {
      // Correndo: inclina até 10° para a frente (16° acima de 60% da vel máx)
      const speedRatio = Math.abs(this.vx) / this.MAX_SPEED;
      const maxTilt = speedRatio > 0.6 ? 16 : 10;
      tiltAngle = maxTilt * speedRatio * this.facing;
    } else if (this.state === 'braking') {
      // Freada forte: inclina 9° para trás
      tiltAngle = -9 * this.facing;
    }

    // 2. Cinemática das Pernas / Passos (Foot-Planting)
    if (this.state === 'running' || this.state === 'braking') {
      const cycleSin = Math.sin(this.stepPhase * Math.PI * 2);
      // Rotação alternada de ±24°
      legLeftAngle = cycleSin * 24;
      legRightAngle = -cycleSin * 24;

      // Pata que está no ar encolhe 22%
      if (cycleSin > 0) {
        legLeftScaleY = 1 - cycleSin * 0.22;
      } else {
        legRightScaleY = 1 - Math.abs(cycleSin) * 0.22;
      }

      // Corpo sobe e desce 2px por passo
      bodyBob = Math.abs(Math.sin(this.stepPhase * Math.PI * 2)) * 2;
    }

    // 3. Senta e bate o pé
    const isSitting = this.state === 'sitting';
    if (isSitting) {
      tapFootY = this.footSpring.pos;
    }

    // 4. Apontando para o botão (118°)
    if (this.state === 'pointing') {
      armAngle = 118 * this.facing;
    }

    // 5. Salto com Squash & Stretch
    if (this.state === 'squashing') {
      // Agacha -16% (squash)
      squashScaleY = 0.84;
      squashScaleX = 1.16;
    } else if (this.state === 'jumping') {
      // No ar estica verticalmente proporcional à subida/queda
      const stretch = Math.min(0.2, Math.abs(this.jumpVy) / 2500);
      squashScaleY = 1 + stretch;
      squashScaleX = 1 - stretch * 0.5;
    } else {
      // Pouso com mola de impacto
      const springCompression = this.landingSpring.pos; // ex: -0.22
      squashScaleY = 1 + springCompression;
      squashScaleX = 1 - springCompression * 0.6;
    }

    // 6. Pirueta 360° em 700ms
    if (this.state === 'spinning') {
      const progress = 1 - this.spinTime / 0.7;
      spinAngle = progress * 360 * this.facing;
      // Pequeno salto durante o giro
      bodyBob = Math.sin(progress * Math.PI) * 28;
    }

    // 7. Tontura
    const isDizzy = this.state === 'dizzy';
    if (isDizzy) {
      const t = 1.6 - this.dizzyTime;
      dizzyAngle = Math.sin(t * 12) * 7; // Balança ±7°
    }

    // 8. Sombra encolhe e clareia com a altura
    const heightRatio = Math.max(0, -this.jumpY) / 160;
    const shadowScale = Math.max(0.4, 1 - heightRatio * 0.5);
    const shadowAlpha = Math.max(0.08, 0.28 * (1 - heightRatio * 0.6));

    // 9. Olhar nos olhos (-1 a 1)
    const gazeDistX = this.targetX - this.x;
    const gazeX = Math.max(-1, Math.min(1, gazeDistX / 180));
    const gazeY = 0;

    this.onUpdate({
      x: this.x,
      y: this.groundY + this.jumpY - bodyBob,
      scaleX: this.facing,
      tiltAngle: tiltAngle + dizzyAngle,
      bodyBob,
      legLeftAngle,
      legRightAngle,
      legLeftScaleY,
      legRightScaleY,
      armAngle,
      jumpY: this.jumpY,
      squashScaleX,
      squashScaleY,
      shadowScale,
      shadowAlpha,
      spinAngle,
      dizzyAngle,
      isSitting,
      isDizzy,
      tapFootY,
      gazeX,
      gazeY,
      state: this.state,
    });
  }
}
