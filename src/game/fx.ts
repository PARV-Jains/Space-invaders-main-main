import { rand, VIEW } from '../core/types';

/* ------------------------------------------------------------------ */
/*  Parallax starfield                                                 */
/* ------------------------------------------------------------------ */

interface Star { x: number; y: number; z: number; }

/** Parallax starfield drawn procedurally (no image assets). */
export class Starfield {
  private stars: Star[] = [];
  constructor(count = 90) {
    for (let i = 0; i < count; i++) {
      this.stars.push({ x: rand(0, VIEW.w), y: rand(0, VIEW.h), z: rand(0.3, 1.4) });
    }
  }
  update(dt: number) {
    for (const s of this.stars) {
      s.y += s.z * 30 * dt;
      if (s.y > VIEW.h) { s.y = 0; s.x = rand(0, VIEW.w); }
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    for (const s of this.stars) {
      const a = 0.3 + s.z * 0.4;
      ctx.fillStyle = `rgba(180,220,255,${a})`;
      ctx.fillRect(s.x, s.y, s.z * 1.6, s.z * 1.6);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Particle system                                                    */
/* ------------------------------------------------------------------ */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; color: string; size: number;
}

/** Lightweight particle system for explosions, sparks, and smoke. */
export class Particles {
  private items: Particle[] = [];

  burst(x: number, y: number, color: string, count = 14, power = 140, size = 4) {
    for (let i = 0; i < count; i++) {
      const ang = rand(0, Math.PI * 2);
      const sp = rand(power * 0.3, power);
      const max = rand(0.3, 0.7);
      const s = rand(size * 0.5, size * 1.2);
      this.items.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: max, max, color, size: s });
    }
  }

  /** Directional spark spray (for hits) */
  spark(x: number, y: number, color: string, angle: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const a = angle + rand(-0.6, 0.6);
      const sp = rand(80, 180);
      const max = rand(0.2, 0.4);
      this.items.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: max, max, color, size: 3 });
    }
  }

  /** Spiral effect (for powerup collection) */
  spiral(x: number, y: number, color: string, count = 12) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 / count) * i;
      const sp = rand(60, 120);
      const max = rand(0.4, 0.8);
      this.items.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 30,
        life: max, max, color, size: rand(3, 6),
      });
    }
  }

  /** Smoke trail — slow, dark, long-lasting particles */
  smoke(x: number, y: number, count = 5, color = 'rgba(120,120,120,1)') {
    for (let i = 0; i < count; i++) {
      const ang = rand(0, Math.PI * 2);
      const sp = rand(10, 35);
      const max = rand(0.6, 1.4);
      this.items.push({
        x: x + rand(-4, 4), y: y + rand(-4, 4),
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 15,
        life: max, max, color, size: rand(5, 10),
      });
    }
  }

  /** Big explosion with smoke + fire + debris */
  bigExplosion(x: number, y: number) {
    // Fire core
    this.burst(x, y, '#ff6b35', 20, 180, 5);
    // Bright flash
    this.burst(x, y, '#ffd700', 10, 100, 6);
    // Smoke ring
    this.smoke(x, y, 12, 'rgba(80,80,80,1)');
    // Embers
    this.burst(x, y, '#ff2e63', 8, 220, 3);
  }

  update(dt: number) {
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      // Slow down smoke particles
      p.vx *= 0.99;
      p.life -= dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.items) {
      const a = p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8; ctx.shadowColor = p.color;
      const hs = p.size / 2;
      // Larger particles draw as circles for smoke effect
      if (p.size > 6) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, hs, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - hs, p.y - hs, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  get count() { return this.items.length; }
}

/* ------------------------------------------------------------------ */
/*  Floating text (score popups, powerup names)                        */
/* ------------------------------------------------------------------ */

interface FloatText {
  x: number; y: number;
  text: string; color: string;
  life: number; max: number;
  size: number;
}

export class FloatingTexts {
  private items: FloatText[] = [];

  add(x: number, y: number, text: string, color: string, size = 16) {
    this.items.push({ x, y, text, color, life: 1.0, max: 1.0, size });
  }

  update(dt: number) {
    for (const t of this.items) {
      t.y -= 50 * dt;
      t.life -= dt;
    }
    this.items = this.items.filter(t => t.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const t of this.items) {
      const a = t.life / t.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px monospace`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 8;
      ctx.shadowColor = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.textAlign = 'start';
  }
}

/* ------------------------------------------------------------------ */
/*  Screen flash (boss hits, events, etc.)                             */
/* ------------------------------------------------------------------ */

export class ScreenFlash {
  private alpha = 0;
  private color = '#fff';

  flash(color = '#fff', intensity = 0.6) {
    this.color = color;
    this.alpha = intensity;
  }

  update(dt: number) {
    if (this.alpha > 0) this.alpha = Math.max(0, this.alpha - dt * 3);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.globalAlpha = 1;
  }
}
