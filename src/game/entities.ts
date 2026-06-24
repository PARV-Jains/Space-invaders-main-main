import { Rect, VIEW, clamp, rand } from '../core/types';

/* ================================================================== */
/*  Bullet                                                             */
/* ================================================================== */

export class Bullet {
  alive = true;
  constructor(
    public x: number,
    public y: number,
    public vy: number,
    public fromPlayer: boolean,
    public vx = 0,
    public color = fromPlayer ? '#39ff14' : '#ff2e63',
  ) {}

  update(dt: number) {
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    if (this.y < -20 || this.y > VIEW.h + 20 || this.x < -20 || this.x > VIEW.w + 20) this.alive = false;
  }
  get rect(): Rect { return { x: this.x - 2, y: this.y - 8, w: 4, h: 16 }; }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10; ctx.shadowColor = this.color;
    ctx.fillRect(this.x - 2, this.y - 8, 4, 16);
    ctx.shadowBlur = 0;
  }
}

/* ================================================================== */
/*  Homing Missile — tracks the player but DODGEABLE                  */
/*  Slow turn rate so player can outmaneuver them.                     */
/* ================================================================== */

export class HomingMissile {
  alive = true;
  x: number; y: number;
  vx = 0; vy = 60;
  speed = 90;       // slower than before (was 140)
  turnRate = 0.8;   // much slower turning (was 2.2) — can be dodged!
  life = 5;         // shorter lifetime so they expire
  w = 6; h = 14;
  /** Smoke trail timer */
  private smokeTimer = 0;
  needsSmoke = false;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
  }

  get rect(): Rect { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  update(dt: number, targetX: number, targetY: number) {
    // Steer toward target — slow enough to dodge
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const desiredVx = (dx / dist) * this.speed;
    const desiredVy = (dy / dist) * this.speed;

    this.vx += (desiredVx - this.vx) * this.turnRate * dt;
    this.vy += (desiredVy - this.vy) * this.turnRate * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    // Smoke trail — emit every few frames
    this.smokeTimer += dt;
    this.needsSmoke = this.smokeTimer > 0.08;
    if (this.needsSmoke) this.smokeTimer = 0;

    if (this.life <= 0 || this.y > VIEW.h + 30 || this.y < -30 || this.x < -30 || this.x > VIEW.w + 30) {
      this.alive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const ang = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    ctx.rotate(ang);
    ctx.fillStyle = '#ff6b35';
    ctx.shadowBlur = 12; ctx.shadowColor = '#ff6b35';
    // Missile body
    ctx.beginPath();
    ctx.moveTo(0, -this.h / 2);
    ctx.lineTo(this.w / 2, this.h / 2);
    ctx.lineTo(-this.w / 2, this.h / 2);
    ctx.closePath();
    ctx.fill();
    // Exhaust flame
    ctx.fillStyle = '#ffb700';
    ctx.beginPath();
    ctx.moveTo(-3, this.h / 2);
    ctx.lineTo(0, this.h / 2 + 8 + rand(0, 4));
    ctx.lineTo(3, this.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

/* ================================================================== */
/*  Landmine — spawns during boss fight, explodes after delay          */
/* ================================================================== */

export class Landmine {
  alive = true;
  x: number; y: number;
  w = 22; h = 22;
  fuseTimer: number;
  private flashTimer = 0;
  exploded = false;
  /** Set to true when it detonates so game.ts can create explosion */
  justExploded = false;

  constructor(x: number, y: number, fuse = 3.0) {
    this.x = x; this.y = y;
    this.fuseTimer = fuse;
  }

  get rect(): Rect { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  update(dt: number) {
    this.fuseTimer -= dt;
    this.flashTimer += dt;
    this.justExploded = false;

    if (this.fuseTimer <= 0 && !this.exploded) {
      this.exploded = true;
      this.justExploded = true;
      this.alive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const urgency = Math.max(0, 1 - this.fuseTimer / 3);
    const flash = Math.sin(this.flashTimer * (6 + urgency * 20)) > 0;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Outer danger zone ring
    ctx.strokeStyle = flash ? '#ff2e63' : '#ff6b35';
    ctx.globalAlpha = 0.2 + urgency * 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 30 + urgency * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Mine body
    ctx.fillStyle = '#333';
    ctx.shadowBlur = flash ? 16 : 8;
    ctx.shadowColor = flash ? '#ff2e63' : '#ff6b35';
    ctx.beginPath();
    ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
    ctx.fill();

    // Spikes
    ctx.fillStyle = '#555';
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 / 8) * i;
      ctx.fillRect(
        Math.cos(a) * (this.w / 2) - 2,
        Math.sin(a) * (this.w / 2) - 2,
        4, 4,
      );
    }

    // Blinking light
    ctx.fillStyle = flash ? '#ff2e63' : '#ff6b35';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

/* ================================================================== */
/*  Player                                                             */
/* ================================================================== */

export class Player {
  x = VIEW.w / 2;
  y = VIEW.h - 70;
  w = 46; h = 38;
  speed = 320;
  cooldown = 0;
  lives = 3;
  invuln = 0;

  // Powerup state
  hasShield = false;
  invertedControls = false;
  fireRateMult = 1;

  get rect(): Rect { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  update(dt: number, left: boolean, right: boolean, targetX: number | null) {
    const l = this.invertedControls ? right : left;
    const r = this.invertedControls ? left : right;

    if (targetX !== null) {
      const d = (this.invertedControls ? VIEW.w - targetX : targetX) - this.x;
      this.x += clamp(d, -this.speed * dt, this.speed * dt);
    } else {
      if (l) this.x -= this.speed * dt;
      if (r) this.x += this.speed * dt;
    }
    this.x = clamp(this.x, this.w / 2, VIEW.w - this.w / 2);
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;
  }

  tryFire(): Bullet | null {
    if (this.cooldown > 0) return null;
    this.cooldown = 0.28 * this.fireRateMult;
    return new Bullet(this.x, this.y - this.h, -560, true);
  }

  tryFireMulti(): Bullet[] {
    if (this.cooldown > 0) return [];
    this.cooldown = 0.28 * this.fireRateMult;
    return [
      new Bullet(this.x - 10, this.y - this.h, -560, true),
      new Bullet(this.x, this.y - this.h, -560, true),
      new Bullet(this.x + 10, this.y - this.h, -560, true),
    ];
  }

  tryFireSpread(): Bullet[] {
    if (this.cooldown > 0) return [];
    this.cooldown = 0.28 * this.fireRateMult;
    return [
      new Bullet(this.x, this.y - this.h, -560, true, -60),
      new Bullet(this.x, this.y - this.h, -560, true, 0),
      new Bullet(this.x, this.y - this.h, -560, true, 60),
    ];
  }

  tryFireConfetti(): Bullet[] {
    if (this.cooldown > 0) return [];
    this.cooldown = 0.2;
    const colors = ['#ff69b4', '#ffd700', '#7fff00', '#ff4500', '#00ffff'];
    const b = new Bullet(this.x, this.y - this.h, -400 + rand(-100, 100), true, rand(-120, 120));
    b.color = colors[Math.floor(rand(0, colors.length))];
    return [b];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shield bubble
    if (this.hasShield) {
      ctx.strokeStyle = '#39ff14';
      ctx.shadowBlur = 16; ctx.shadowColor = '#39ff14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Detailed pixel-art drawing with neon shadow
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00e5ff';

    const SHIP_ROWS = [
      '...........O...........',
      '..........OWO..........',
      '..........OBO..........',
      '.........OABAO.........',
      '.........OABAO.........',
      '........OAABAAO........',
      '.......OACABACAO.......',
      '......OACABBBACAO......',
      '.....OACAKKDKKACAO.....',
      '.....OACAKKKKKACAO.....',
      '....OACAOOKKKOACAO....',
      '...OACAOOKKKKKOACAO...',
      '..OACAOOKKKKKKKOACAO..',
      '.OACAOOKKKKKKKKKKOACAO.',
      'OAABO..OOBDODBOO..OBAAO',
      '.OBBBO...OBBBO...OBBBO.',
      '.ODFDO...ODFDO...ODFDO.',
      '..ODO.....ODO.....ODO..',
      '...O.......O.......O...',
    ];

    const PALETTE: Record<string, string> = {
      'W': '#ffffff',
      'A': '#cbd5e0',
      'C': '#718096',
      'K': '#2d3748',
      'B': '#00e5ff',
      'D': '#0055ff',
      'F': '#88ecff',
      'O': '#1a202c',
    };

    const startX = -this.w / 2;
    const startY = -this.h / 2;

    for (let r = 0; r < SHIP_ROWS.length; r++) {
      const row = SHIP_ROWS[r];
      for (let c = 0; c < row.length; c++) {
        const char = row[c];
        if (char !== '.' && char !== ' ') {
          ctx.fillStyle = PALETTE[char] || '#ffffff';
          ctx.fillRect(startX + c * 2, startY + r * 2, 2, 2);
        }
      }
    }

    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

/* ================================================================== */
/*  Enemy — with varied movement patterns + name labels                */
/* ================================================================== */

export type MovementPattern = 'standard' | 'zigzag' | 'circular' | 'dive' | 'evasive';

export class Enemy {
  alive = true;
  movementPattern: MovementPattern;
  private patternTimer = 0;
  private divingAt: { x: number; y: number } | null = null;
  private originalY: number;
  private circleAngle = 0;
  kamikaze = false;
  /** Display name for this enemy type */
  displayName = '';

  constructor(
    public x: number,
    public y: number,
    public hp: number,
    public kind: number,
  ) {
    this.originalY = y;
    const patterns: MovementPattern[] = ['standard', 'zigzag', 'circular', 'evasive'];
    this.movementPattern = patterns[kind % patterns.length];
    this.circleAngle = rand(0, Math.PI * 2);
  }

  w = 30; h = 22;
  get rect(): Rect { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  applyPattern(dt: number, playerX: number) {
    this.patternTimer += dt;

    switch (this.movementPattern) {
      case 'zigzag':
        this.y = this.originalY + Math.sin(this.patternTimer * 3) * 8;
        break;
      case 'circular':
        this.circleAngle += dt * 2;
        this.x += Math.cos(this.circleAngle) * 20 * dt;
        this.y = this.originalY + Math.sin(this.circleAngle) * 6;
        break;
      case 'evasive':
        if (Math.random() < 0.02) this.x += rand(-15, 15);
        break;
      case 'dive':
        if (!this.divingAt && Math.random() < 0.003) {
          this.divingAt = { x: playerX, y: VIEW.h - 100 };
        }
        if (this.divingAt) {
          this.x += (this.divingAt.x - this.x) * 2 * dt;
          this.y += 180 * dt;
          if (this.y > this.divingAt.y) this.divingAt = null;
        }
        break;
    }

    if (this.kamikaze) {
      this.y += 200 * dt;
      this.x += (playerX - this.x) * 1.5 * dt;
    }

    this.x = clamp(this.x, this.w / 2, VIEW.w - this.w / 2);
  }

  setY(newY: number) {
    this.originalY = newY;
    this.y = newY;
  }

  draw(ctx: CanvasRenderingContext2D, phase: number) {
    const colors = ['#ff2e63', '#ffb700', '#b14bff'];
    const c = this.kamikaze ? '#ff0000' : colors[this.kind % colors.length];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = c;
    ctx.shadowBlur = 10; ctx.shadowColor = c;
    const wig = Math.sin(phase) * 2;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h * 0.55);
    ctx.fillRect(-this.w / 2 - 2, this.h / 6 + wig, 6, 6);
    ctx.fillRect(this.w / 2 - 4, this.h / 6 - wig, 6, 6);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(-this.w / 4, -this.h / 5, 5, 5);
    ctx.fillRect(this.w / 4 - 5, -this.h / 5, 5, 5);

    if (this.kamikaze) {
      ctx.fillStyle = '#ff0000';
      ctx.shadowBlur = 16; ctx.shadowColor = '#ff0000';
      ctx.fillRect(-this.w / 4, -this.h / 5, 5, 5);
      ctx.fillRect(this.w / 4 - 5, -this.h / 5, 5, 5);
    }

    ctx.restore();
    ctx.shadowBlur = 0;

    // Draw name label above enemy
    if (this.displayName) {
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.6;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.displayName, this.x, this.y - this.h / 2 - 4);
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
    }
  }
}

/* ================================================================== */
/*  Boss — END SEMS — multi-phase with shield weakness                 */
/* ================================================================== */

export type BossWeapon = 'radial' | 'missile_barrage' | 'energy_bomb' | 'laser_sweep' | 'meteor' | 'landmine';

export class Boss {
  alive = true;
  x = VIEW.w / 2;
  y = 140;
  w = 200; h = 90;
  maxHp: number;
  hp: number;
  private t = 0;
  private dir = 1;

  // Shield weakness mechanic
  shieldActive = true;
  shieldCooldown = 0;
  weakPointTimer = 0;
  weakPointActive = false;
  weakPointX = 0;
  weakPointY = 0;
  shieldDisabledTimer = 0;

  // Attack system
  private attackTimer = 0;
  private currentWeapon: BossWeapon = 'radial';
  private weaponPool: BossWeapon[] = ['radial', 'missile_barrage', 'energy_bomb', 'laser_sweep', 'meteor', 'landmine'];

  // Clone system (Phase 3)
  clones: BossClone[] = [];
  private cloneTimer = 0;

  // Landmine spawning
  pendingMines: { x: number; y: number }[] = [];

  // Visual
  introTimer = 2.0;
  glitchIntensity = 0;

  constructor(hp: number) {
    this.maxHp = hp;
    this.hp = hp;
    this.selectWeapon();
  }

  get rect(): Rect { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  get phase(): number { return this.hp / this.maxHp; }
  get bossPhase(): 1 | 2 | 3 { return this.phase > 0.6 ? 1 : this.phase > 0.2 ? 2 : 3; }

  private selectWeapon() {
    this.currentWeapon = this.weaponPool[Math.floor(rand(0, this.weaponPool.length))];
    this.attackTimer = 0;
  }

  update(dt: number): { bullets: Bullet[]; missiles: HomingMissile[] } {
    this.t += dt;
    const result: { bullets: Bullet[]; missiles: HomingMissile[] } = { bullets: [], missiles: [] };
    this.pendingMines = [];

    if (this.introTimer > 0) { this.introTimer -= dt; return result; }

    const speedMult = this.bossPhase === 1 ? 1 : this.bossPhase === 2 ? 1.6 : 2.5;
    this.x += this.dir * 60 * dt * speedMult;
    if (this.x < this.w / 2 || this.x > VIEW.w - this.w / 2) this.dir *= -1;

    if (this.bossPhase === 3) {
      this.x += Math.sin(this.t * 8) * 40 * dt;
      this.glitchIntensity = 0.3 + Math.sin(this.t * 12) * 0.2;
    } else {
      this.glitchIntensity = 0;
    }

    this.updateShield(dt);

    this.attackTimer += dt;
    const attackInterval = this.bossPhase === 1 ? 1.0 : this.bossPhase === 2 ? 0.6 : 0.35;

    if (this.attackTimer >= attackInterval) {
      this.attackTimer = 0;
      this.executeAttack(result);
      if (Math.random() < 0.3) this.selectWeapon();
    }

    // Phase 2+: occasional homing missiles (less frequent now)
    if (this.bossPhase >= 2 && Math.floor(this.t * 1.2) !== Math.floor((this.t - dt) * 1.2)) {
      result.missiles.push(new HomingMissile(this.x + rand(-40, 40), this.y + this.h / 2));
    }

    // Phase 3: spawn clones
    if (this.bossPhase === 3) {
      this.cloneTimer += dt;
      if (this.cloneTimer > 6 && this.clones.length < 2) {
        this.cloneTimer = 0;
        this.clones.push(new BossClone(rand(80, VIEW.w - 80), rand(80, 200)));
      }
    }

    for (const c of this.clones) {
      const fired = c.update(dt);
      result.bullets.push(...fired);
    }
    this.clones = this.clones.filter(c => c.alive);

    return result;
  }

  private updateShield(dt: number) {
    if (this.shieldDisabledTimer > 0) {
      this.shieldDisabledTimer -= dt;
      this.shieldActive = false;
      this.weakPointActive = false;
      if (this.shieldDisabledTimer <= 0) {
        this.shieldActive = true;
        this.weakPointTimer = 0;
      }
      return;
    }

    this.shieldActive = true;
    this.weakPointTimer += dt;
    const interval = this.bossPhase === 1 ? 8 : this.bossPhase === 2 ? 5 : 3;

    if (!this.weakPointActive && this.weakPointTimer >= interval) {
      this.weakPointActive = true;
      this.weakPointX = this.x + rand(-60, 60);
      this.weakPointY = this.y + rand(-20, 30);
      this.weakPointTimer = 0;
    }

    if (this.weakPointActive) {
      this.weakPointTimer += dt;
      if (this.weakPointTimer > 3) {
        this.weakPointActive = false;
        this.weakPointTimer = 0;
      }
    }
  }

  disableShield() {
    this.shieldActive = false;
    this.weakPointActive = false;
    this.shieldDisabledTimer = 5;
    this.weakPointTimer = 0;
  }

  get weakPointRect(): Rect | null {
    if (!this.weakPointActive) return null;
    return { x: this.weakPointX - 8, y: this.weakPointY - 8, w: 16, h: 16 };
  }

  get vulnerable(): boolean { return !this.shieldActive; }

  private executeAttack(result: { bullets: Bullet[]; missiles: HomingMissile[] }) {
    const intensity = 1 + (1 - this.phase) * 3;

    switch (this.currentWeapon) {
      case 'radial': {
        const arms = Math.floor(5 * intensity);
        for (let i = 0; i < arms; i++) {
          const ang = (Math.PI / (arms - 1)) * i;
          const sp = 180 + intensity * 40;
          result.bullets.push(new Bullet(
            this.x, this.y + this.h / 2,
            Math.sin(ang) * sp + 80, false,
            Math.cos(ang) * sp, '#ff2e63',
          ));
        }
        break;
      }
      case 'missile_barrage': {
        const count = this.bossPhase === 1 ? 1 : this.bossPhase === 2 ? 2 : 3;
        for (let i = 0; i < count; i++) {
          result.missiles.push(new HomingMissile(this.x + rand(-50, 50), this.y + this.h / 2));
        }
        break;
      }
      case 'energy_bomb': {
        const count = Math.floor(8 + intensity * 3);
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 / count) * i + this.t;
          result.bullets.push(new Bullet(this.x, this.y, Math.sin(ang) * 120, false, Math.cos(ang) * 120, '#b14bff'));
        }
        break;
      }
      case 'laser_sweep': {
        const count = 6;
        for (let i = 0; i < count; i++) {
          const offset = (i - count / 2) * 25;
          result.bullets.push(new Bullet(this.x + offset, this.y + this.h / 2, 240, false, 0, '#00e5ff'));
        }
        break;
      }
      case 'meteor': {
        const count = Math.floor(3 + intensity);
        for (let i = 0; i < count; i++) {
          result.bullets.push(new Bullet(rand(40, VIEW.w - 40), -10, rand(150, 300), false, rand(-30, 30), '#ffb700'));
        }
        break;
      }
      case 'landmine': {
        // Drop landmines at random positions
        const count = this.bossPhase === 1 ? 1 : this.bossPhase === 2 ? 2 : 3;
        for (let i = 0; i < count; i++) {
          this.pendingMines.push({
            x: rand(60, VIEW.w - 60),
            y: rand(VIEW.h - 300, VIEW.h - 130),
          });
        }
        break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const introScale = this.introTimer > 0 ? Math.max(0, 1 - this.introTimer / 2) : 1;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.glitchIntensity > 0) {
      ctx.translate(rand(-3, 3) * this.glitchIntensity * 10, rand(-2, 2) * this.glitchIntensity * 10);
    }

    ctx.scale(introScale, introScale);

    const c = this.bossPhase === 3 ? '#ff0000' : this.bossPhase === 2 ? '#ff2e63' : '#b14bff';

    // Shield visual
    if (this.shieldActive) {
      ctx.strokeStyle = '#00e5ff';
      ctx.shadowBlur = 20; ctx.shadowColor = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + Math.sin(this.t * 4) * 0.15;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.w / 2 + 14, this.h / 2 + 14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Main body
    ctx.fillStyle = c;
    ctx.shadowBlur = 24; ctx.shadowColor = c;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#05060f';
    const eye = Math.abs(Math.sin(this.t * 2));
    ctx.beginPath();
    ctx.ellipse(0, -6, 34, 18 * eye + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.bossPhase === 3 ? '#ff0000' : '#39ff14';
    ctx.beginPath();
    ctx.arc(0, -4, 8, 0, Math.PI * 2);
    ctx.fill();

    // Boss name label
    ctx.fillStyle = c;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('END SEMS', 0, this.h / 2 + 16);

    ctx.restore();
    ctx.shadowBlur = 0;

    // Weak point
    if (this.weakPointActive) {
      const wp = this.weakPointRect!;
      ctx.save();
      ctx.fillStyle = '#ffd700';
      ctx.shadowBlur = 20; ctx.shadowColor = '#ffd700';
      ctx.globalAlpha = 0.6 + Math.sin(this.t * 10) * 0.3;
      ctx.beginPath();
      ctx.arc(wp.x + wp.w / 2, wp.y + wp.h / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wp.x + wp.w / 2 - 14, wp.y + wp.h / 2);
      ctx.lineTo(wp.x + wp.w / 2 + 14, wp.y + wp.h / 2);
      ctx.moveTo(wp.x + wp.w / 2, wp.y + wp.h / 2 - 14);
      ctx.lineTo(wp.x + wp.w / 2, wp.y + wp.h / 2 + 14);
      ctx.stroke();
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // Clones
    for (const c2 of this.clones) c2.draw(ctx);

    // Health bar
    const bw = VIEW.w - 60;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(30, 20, bw, 8);
    const barColor = this.bossPhase === 3 ? '#ff0000' : this.bossPhase === 2 ? '#ff2e63' : '#b14bff';
    ctx.fillStyle = barColor;
    ctx.fillRect(30, 20, bw * this.phase, 8);

    // Shield status
    if (this.shieldActive) {
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('◈ SHIELDED', VIEW.w / 2, 16);
      ctx.textAlign = 'start';
    } else if (this.shieldDisabledTimer > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`◈ SHIELD DOWN ${this.shieldDisabledTimer.toFixed(1)}s`, VIEW.w / 2, 16);
      ctx.textAlign = 'start';
    }
  }
}

/* ================================================================== */
/*  Boss Clone                                                         */
/* ================================================================== */

export class BossClone {
  alive = true;
  x: number; y: number;
  w = 80; h = 40;
  private t = 0;
  private life = 8;
  private dir = Math.random() > 0.5 ? 1 : -1;

  constructor(x: number, y: number) { this.x = x; this.y = y; }
  get rect(): Rect { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  update(dt: number): Bullet[] {
    this.t += dt;
    this.life -= dt;
    this.x += this.dir * 80 * dt;
    if (this.x < this.w / 2 || this.x > VIEW.w - this.w / 2) this.dir *= -1;
    if (this.life <= 0) { this.alive = false; return []; }
    const bullets: Bullet[] = [];
    if (Math.floor(this.t * 3) !== Math.floor((this.t - dt) * 3)) {
      bullets.push(new Bullet(this.x, this.y + this.h / 2, 200, false, rand(-30, 30), '#ff2e63'));
    }
    return bullets;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = 0.5 + Math.sin(this.t * 6) * 0.2;
    ctx.fillStyle = '#ff2e63';
    ctx.shadowBlur = 16; ctx.shadowColor = '#ff2e63';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05060f';
    ctx.beginPath();
    ctx.ellipse(0, -3, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

/* ================================================================== */
/*  Shield                                                             */
/* ================================================================== */

export class Shield {
  blocks: boolean[][];
  cell = 6;
  cols = 8; rows = 4;
  constructor(public x: number, public y: number) {
    this.blocks = Array.from({ length: this.rows }, () => Array(this.cols).fill(true));
  }
  hitAt(bx: number, by: number): boolean {
    const cx = Math.floor((bx - this.x) / this.cell);
    const cy = Math.floor((by - this.y) / this.cell);
    if (cy < 0 || cy >= this.rows || cx < 0 || cx >= this.cols) return false;
    if (!this.blocks[cy][cx]) return false;
    this.blocks[cy][cx] = false;
    const ny = cy + 1; if (ny < this.rows) this.blocks[ny][cx] = false;
    return true;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#00e5ff';
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.blocks[r][c]) ctx.fillRect(this.x + c * this.cell, this.y + r * this.cell, this.cell - 1, this.cell - 1);
  }
}
