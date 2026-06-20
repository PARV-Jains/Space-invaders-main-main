import { Rect, VIEW, rand } from '../core/types';

/* ------------------------------------------------------------------ */
/*  Event type definitions                                             */
/* ------------------------------------------------------------------ */

export type EventType = 'asteroids' | 'gravity' | 'frenzy' | 'storm';

interface GameEvent {
  type: EventType;
  name: string;
  duration: number;
  warningText: string;
  color: string;
}

const EVENT_DEFS: GameEvent[] = [
  { type: 'asteroids', name: 'ASTEROID SHOWER',  duration: 8,  warningText: '⚠ ASTEROID SHOWER INCOMING ⚠', color: '#ffb700' },
  { type: 'gravity',   name: 'GRAVITY WELL',     duration: 6,  warningText: '⚠ GRAVITY ANOMALY DETECTED ⚠', color: '#b14bff' },
  { type: 'frenzy',    name: 'ALIEN FRENZY',      duration: 7,  warningText: '⚠ ENEMIES ENRAGED ⚠',          color: '#ff2e63' },
  { type: 'storm',     name: 'SPACE STORM',       duration: 8,  warningText: '⚠ SPACE STORM APPROACHING ⚠',  color: '#00e5ff' },
];

/* ------------------------------------------------------------------ */
/*  Asteroid entity — flies across screen during Asteroid Shower       */
/* ------------------------------------------------------------------ */

export class Asteroid {
  alive = true;
  w = 20; h = 20;
  rotation = 0;

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public size: number,
  ) {
    this.w = size;
    this.h = size;
  }

  get rect(): Rect { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += dt * 3;
    if (this.y > VIEW.h + 40 || this.y < -40 || this.x > VIEW.w + 40 || this.x < -40) {
      this.alive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#8a7560';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffb700';
    // Draw irregular rock shape
    ctx.beginPath();
    const pts = 7;
    for (let i = 0; i < pts; i++) {
      const ang = (Math.PI * 2 / pts) * i;
      const r = this.size / 2 * (0.7 + Math.sin(i * 2.5) * 0.3);
      if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c4a678';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

/* ------------------------------------------------------------------ */
/*  EventManager — triggers random events with warning banners         */
/* ------------------------------------------------------------------ */

export class EventManager {
  activeEvent: GameEvent | null = null;
  eventTimer = 0;
  warningTimer = 0;
  warningText = '';
  warningColor = '';
  asteroids: Asteroid[] = [];

  private cooldown = 0;
  private minCooldown = 15;
  private maxCooldown = 30;
  private asteroidSpawnTimer = 0;

  /** Modifiers that game.ts reads to alter gameplay */
  enemySpeedMult = 1;
  enemyFireMult = 1;
  gravityPullX = 0;
  gravityPullY = 0;
  stormActive = false;
  stormFlash = 0;

  update(dt: number) {
    // Warning countdown phase
    if (this.warningTimer > 0) {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) this.startEvent();
      this.updateWarningDisplay();
      return;
    }

    // Active event phase
    if (this.activeEvent) {
      this.eventTimer -= dt;
      this.tickEvent(dt);
      if (this.eventTimer <= 0) this.endEvent();
      return;
    }

    // Cooldown between events
    this.cooldown -= dt;
    if (this.cooldown <= 0) this.triggerWarning();
  }

  private triggerWarning() {
    const def = EVENT_DEFS[Math.floor(rand(0, EVENT_DEFS.length))];
    this.warningText = def.warningText;
    this.warningColor = def.color;
    this.warningTimer = 2.5;
    this.activeEvent = def; // staged — starts after warning
    this.updateWarningDisplay();
  }

  private startEvent() {
    if (!this.activeEvent) return;
    this.eventTimer = this.activeEvent.duration;
    this.hideWarning();

    switch (this.activeEvent.type) {
      case 'frenzy':
        this.enemySpeedMult = 1.8;
        this.enemyFireMult = 2.5;
        break;
      case 'storm':
        this.stormActive = true;
        break;
    }
  }

  private tickEvent(dt: number) {
    if (!this.activeEvent) return;

    switch (this.activeEvent.type) {
      case 'asteroids':
        this.asteroidSpawnTimer += dt;
        if (this.asteroidSpawnTimer > 0.4) {
          this.asteroidSpawnTimer = 0;
          const fromTop = Math.random() > 0.3;
          if (fromTop) {
            this.asteroids.push(new Asteroid(
              rand(0, VIEW.w), -30,
              rand(-40, 40), rand(100, 200),
              rand(14, 28),
            ));
          } else {
            const fromLeft = Math.random() > 0.5;
            this.asteroids.push(new Asteroid(
              fromLeft ? -30 : VIEW.w + 30,
              rand(100, VIEW.h - 200),
              fromLeft ? rand(80, 160) : rand(-160, -80),
              rand(-20, 60),
              rand(14, 28),
            ));
          }
        }
        break;

      case 'gravity':
        this.gravityPullX = VIEW.w / 2;
        this.gravityPullY = VIEW.h / 2;
        break;

      case 'storm':
        this.stormFlash = Math.random() < 0.02 ? 1 : Math.max(0, this.stormFlash - dt * 5);
        break;
    }

    // Update asteroids
    for (const a of this.asteroids) a.update(dt);
    this.asteroids = this.asteroids.filter(a => a.alive);
  }

  private endEvent() {
    this.activeEvent = null;
    this.eventTimer = 0;
    this.enemySpeedMult = 1;
    this.enemyFireMult = 1;
    this.gravityPullX = 0;
    this.gravityPullY = 0;
    this.stormActive = false;
    this.stormFlash = 0;
    this.cooldown = rand(this.minCooldown, this.maxCooldown);
  }

  private updateWarningDisplay() {
    const el = document.getElementById('event-warning');
    if (!el) return;
    el.classList.remove('hidden');
    el.textContent = this.warningText;
    el.style.color = this.warningColor;
    el.style.textShadow = `0 0 20px ${this.warningColor}`;
  }

  private hideWarning() {
    const el = document.getElementById('event-warning');
    if (el) el.classList.add('hidden');
  }

  /** Render storm overlay and asteroids on canvas */
  drawOverlay(ctx: CanvasRenderingContext2D) {
    for (const a of this.asteroids) a.draw(ctx);

    if (this.stormActive) {
      ctx.fillStyle = `rgba(5, 6, 15, ${0.3 + Math.sin(this.eventTimer * 2) * 0.1})`;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      if (this.stormFlash > 0) {
        ctx.fillStyle = `rgba(200, 220, 255, ${this.stormFlash * 0.4})`;
        ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      }
    }
  }

  reset() {
    this.activeEvent = null;
    this.eventTimer = 0;
    this.warningTimer = 0;
    this.asteroids = [];
    this.asteroidSpawnTimer = 0;
    this.enemySpeedMult = 1;
    this.enemyFireMult = 1;
    this.gravityPullX = 0;
    this.gravityPullY = 0;
    this.stormActive = false;
    this.stormFlash = 0;
    this.cooldown = rand(this.minCooldown, this.maxCooldown);
    this.hideWarning();
  }
}
