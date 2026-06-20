import { Rect, VIEW, rand } from '../core/types';

/* ------------------------------------------------------------------ */
/*  Powerup type definitions                                           */
/* ------------------------------------------------------------------ */

export type PowerupType =
  | 'multishot' | 'spread' | 'rapidfire' | 'shield'
  | 'timedilation' | 'blackhole'
  | 'inverted' | 'confetti' | 'blindness' | 'slowfire';

export const POWERUP_INFO: Record<PowerupType, { name: string; color: string; positive: boolean; duration: number; icon: string }> = {
  multishot:    { name: 'MULTISHOT',       color: '#39ff14', positive: true,  duration: 8,  icon: '⫸' },
  spread:       { name: 'SPREAD SHOT',     color: '#00e5ff', positive: true,  duration: 8,  icon: '⋔' },
  rapidfire:    { name: 'RAPID FIRE',      color: '#ffb700', positive: true,  duration: 6,  icon: '⚡' },
  shield:       { name: 'SHIELD',          color: '#39ff14', positive: true,  duration: 10, icon: '◈' },
  timedilation: { name: 'TIME DILATION',   color: '#b14bff', positive: true,  duration: 5,  icon: '◎' },
  blackhole:    { name: 'BLACK HOLE BOMB', color: '#b14bff', positive: true,  duration: 0,  icon: '●' },
  inverted:     { name: 'INVERTED!',       color: '#ff2e63', positive: false, duration: 5,  icon: '⇄' },
  confetti:     { name: 'CONFETTI GUN!',   color: '#ff2e63', positive: false, duration: 6,  icon: '✿' },
  blindness:    { name: 'FLASH BANG!',     color: '#ff2e63', positive: false, duration: 3,  icon: '◉' },
  slowfire:     { name: 'JAM!',            color: '#ff2e63', positive: false, duration: 5,  icon: '▼' },
};

const ALL_TYPES: PowerupType[] = Object.keys(POWERUP_INFO) as PowerupType[];

/* ------------------------------------------------------------------ */
/*  Crate — falls from the top, player collects it                     */
/* ------------------------------------------------------------------ */

export class Crate {
  alive = true;
  type: PowerupType;
  w = 24; h = 24;
  private bob = 0;

  constructor(public x: number, public y: number) {
    this.type = ALL_TYPES[Math.floor(rand(0, ALL_TYPES.length))];
  }

  get rect(): Rect { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  get info() { return POWERUP_INFO[this.type]; }

  update(dt: number) {
    this.y += 60 * dt;
    this.bob += dt * 4;
    if (this.y > VIEW.h + 30) this.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const info = this.info;
    const bobY = Math.sin(this.bob) * 3;
    ctx.save();
    ctx.translate(this.x, this.y + bobY);

    // Outer glow
    ctx.shadowBlur = 16;
    ctx.shadowColor = info.color;

    // Box border
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // Inner fill
    ctx.fillStyle = info.color + '25';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // Icon
    ctx.fillStyle = info.color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.icon, 0, 0);

    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Active powerup tracking                                            */
/* ------------------------------------------------------------------ */

export interface ActivePowerup {
  type: PowerupType;
  remaining: number;
  duration: number;
}

/* ------------------------------------------------------------------ */
/*  PowerupManager — spawns crates, tracks active effects              */
/* ------------------------------------------------------------------ */

export class PowerupManager {
  active: ActivePowerup[] = [];
  crates: Crate[] = [];
  private spawnTimer = 0;
  private spawnInterval = 12;

  /** Call each frame from the game loop */
  update(dt: number) {
    // Spawn timer
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnInterval = rand(10, 18);
      this.spawnCrate();
    }

    // Update falling crates
    for (const c of this.crates) c.update(dt);
    this.crates = this.crates.filter(c => c.alive);

    // Tick active powerup durations
    for (const p of this.active) p.remaining -= dt;
    this.active = this.active.filter(p => p.remaining > 0);
  }

  private spawnCrate() {
    const x = rand(40, VIEW.w - 40);
    this.crates.push(new Crate(x, -30));
  }

  /** Activate a collected powerup */
  collect(type: PowerupType) {
    const info = POWERUP_INFO[type];
    if (info.duration > 0) {
      // Remove existing of same type to avoid stacking
      this.active = this.active.filter(p => p.type !== type);
      this.active.push({ type, remaining: info.duration, duration: info.duration });
    }
    // blackhole is instant — handled directly by game.ts
  }

  /** Check if a powerup type is currently active */
  has(type: PowerupType): boolean {
    return this.active.some(p => p.type === type);
  }

  drawCrates(ctx: CanvasRenderingContext2D) {
    for (const c of this.crates) c.draw(ctx);
  }

  /** Render HUD pills for active powerups */
  drawHud() {
    const el = document.getElementById('powerup-hud');
    if (!el) return;
    if (this.active.length === 0) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = this.active.map(p => {
      const info = POWERUP_INFO[p.type];
      const pct = Math.ceil(p.remaining / p.duration * 100);
      return `<div class="powerup-pill" style="border-color:${info.color};color:${info.color}">${info.icon} ${info.name} ${pct}%</div>`;
    }).join('');
  }

  reset() {
    this.active = [];
    this.crates = [];
    this.spawnTimer = 0;
  }
}
