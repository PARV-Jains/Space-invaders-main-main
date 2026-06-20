import { VIEW, Scene, aabb, rand } from '../core/types';
import { Input } from '../core/input';
import { Sfx } from '../core/audio';
import { Leaderboard } from '../core/leaderboard';
import { Starfield, Particles, FloatingTexts, ScreenFlash } from './fx';
import { Player, Enemy, Boss, Bullet, Shield, HomingMissile, Landmine } from './entities';
import { LEVELS, INTRO, VICTORY, StoryBeat } from './levels';
import { UI } from './ui';
import { PowerupManager, POWERUP_INFO } from './powerups';
import { EventManager } from './events';

export class Game {
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private sfx = new Sfx();
  private lb = new Leaderboard();
  private ui: UI;

  private scene: Scene = 'menu';
  private stars = new Starfield();
  private particles = new Particles();
  private floatingTexts = new FloatingTexts();
  private screenFlash = new ScreenFlash();

  private player = new Player();
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private bullets: Bullet[] = [];
  private missiles: HomingMissile[] = [];
  private landmines: Landmine[] = [];
  private shields: Shield[] = [];

  private powerups = new PowerupManager();
  private events = new EventManager();

  private swarmDir = 1;
  private swarmPhase = 0;
  private levelIndex = 0;
  private score = 0;
  private shake = 0;
  private last = 0;
  private scoreSubmitted = false;
  private bossFightTime = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.input = new Input(canvas);
    this.ui = new UI(this.lb, this.sfx);   // pass sfx for typing sounds
    this.resize();
    window.addEventListener('resize', () => this.resize());

    if (!history.state) history.replaceState({ scene: 'menu' }, '');

    window.addEventListener('popstate', (e) => {
      const state = e.state;
      if (state && state.scene) {
        switch (state.scene) {
          case 'menu': this.showMenu(true); break;
          case 'leaderboard': this.showLeaderboard(state.back || 'menu', true); break;
          case 'gameover': this.gameOver(true); break;
          default: this.showMenu(true); break;
        }
      } else { this.showMenu(true); }
    });

    this.showMenu();
    requestAnimationFrame((t) => this.loop(t));
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ar = VIEW.w / VIEW.h;
    let w = window.innerWidth, h = window.innerHeight;
    if (w / h > ar) w = h * ar; else h = w / ar;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = VIEW.w * dpr;
    this.canvas.height = VIEW.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---- Scene transitions ------------------------------------------------

  private showMenu(isPopState = false) {
    this.scene = 'menu';
    this.toggleHud(false);
    this.sfx.stopAllMusic();
    this.clearWarning();
    if (!isPopState && history.state?.scene !== 'menu') {
      history.pushState({ scene: 'menu' }, '');
    }
    this.ui.menu(
      () => { this.sfx.click(); this.beginCampaign(); },
      () => { this.sfx.click(); this.showLeaderboard('menu'); }
    );
  }

  private beginCampaign() {
    this.score = 0;
    this.levelIndex = 0;
    this.player = new Player();
    this.scoreSubmitted = false;
    this.bossFightTime = 0;
    this.powerups.reset();
    this.events.reset();
    this.missiles = [];
    this.landmines = [];
    this.clearWarning();
    this.sfx.intro();
    if (history.state?.scene !== 'play') {
      history.pushState({ scene: 'play' }, '');
    }
    this.tellStory(INTRO, () => this.startLevel());
  }

  private tellStory(beats: StoryBeat[], done: () => void) {
    this.scene = 'story';
    this.toggleHud(false);
    this.sfx.stopAllMusic();
    this.clearWarning();
    this.sfx.startStoryMusic();
    this.ui.story(beats, () => {
      this.sfx.stopStoryMusic();
      done();
    });
  }

  private startLevel() {
    const def = LEVELS[this.levelIndex];
    this.tellStory(def.story, () => {
      this.scene = 'play';
      this.ui.clear();
      this.toggleHud(true);
      this.bullets = [];
      this.missiles = [];
      this.landmines = [];
      this.particles = new Particles();
      this.floatingTexts = new FloatingTexts();
      this.screenFlash = new ScreenFlash();
      this.buildShields();
      this.swarmDir = 1;
      this.powerups.reset();
      this.events.reset();
      this.clearWarning();

      if (def.isBoss) {
        this.boss = new Boss(def.enemyHp);
        this.enemies = [];
        this.bossFightTime = 0;
        this.sfx.stopAllMusic();
        this.sfx.startBossMusic();
      } else {
        this.boss = null;
        this.spawnSwarm();
        this.sfx.stopAllMusic();
        this.sfx.startGameplayMusic();
      }
      this.sfx.levelUp();
      this.updateHud();
    });
  }

  private buildShields() {
    this.shields = [];
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = (VIEW.w / (n + 1)) * (i + 1) - 24;
      this.shields.push(new Shield(x, VIEW.h - 180));
    }
  }

  private spawnSwarm() {
    const def = LEVELS[this.levelIndex];
    this.enemies = [];
    const offX = 50, offY = 90, gx = (VIEW.w - 100) / (def.cols - 1 || 1), gy = 42;
    for (let r = 0; r < def.rows; r++) {
      for (let c = 0; c < def.cols; c++) {
        const enemy = new Enemy(offX + c * gx, offY + r * gy, def.enemyHp, r);
        // Assign funny names
        if (def.enemyNames && def.enemyNames.length > 0) {
          enemy.displayName = def.enemyNames[r % def.enemyNames.length];
        }
        this.enemies.push(enemy);
      }
    }
  }

  private showLeaderboard(back: 'menu' | 'gameover', isPopState = false) {
    this.scene = 'leaderboard';
    this.toggleHud(false);
    this.clearWarning();
    if (!isPopState) {
      history.pushState({ scene: 'leaderboard', back }, '');
    }
    this.ui.leaderboard(() => {
      this.sfx.click();
      history.back();
    });
  }

  private async gameOver(isPopState = false) {
    this.scene = 'gameover';
    this.toggleHud(false);
    this.sfx.stopAllMusic();
    this.clearWarning();
    this.sfx.defeatSound();
    if (!isPopState && history.state?.scene !== 'gameover') {
      history.pushState({ scene: 'gameover' }, '');
    }
    await this.ui.gameOver(
      this.score,
      this.levelIndex + 1,
      () => { this.sfx.click(); this.showMenu(); },
      () => { this.sfx.click(); this.showLeaderboard('gameover'); },
      this.scoreSubmitted,
      () => { this.scoreSubmitted = true; }
    );
  }

  private victory() {
    this.scene = 'victory';
    this.toggleHud(false);
    this.sfx.stopAllMusic();
    this.clearWarning();
    this.sfx.victoryJingle();
    void this.lb.submit({ player: this.lb.getName() || 'ACE', score: this.score + 100000, level: LEVELS.length });
    this.tellStory(VICTORY, () => { this.sfx.click(); this.showMenu(); });
  }

  /** Hide the event warning banner */
  private clearWarning() {
    const el = document.getElementById('event-warning');
    if (el) el.classList.add('hidden');
  }

  // ---- Main loop --------------------------------------------------------

  private loop(t: number) {
    const dt = Math.min((t - this.last) / 1000 || 0, 0.05);
    this.last = t;
    this.stars.update(dt);
    if (this.scene === 'play') this.simulate(dt);
    this.particles.update(dt);
    this.floatingTexts.update(dt);
    this.screenFlash.update(dt);
    this.render(dt);
    requestAnimationFrame((n) => this.loop(n));
  }

  private simulate(dt: number) {
    const def = LEVELS[this.levelIndex];
    this.applyPowerupEffects();

    // Gravity well from events
    if (this.events.gravityPullX > 0) {
      const pullStrength = 60;
      this.player.x += (this.events.gravityPullX - this.player.x) * pullStrength * dt / VIEW.w;
    }

    this.player.update(dt, this.input.left, this.input.right, this.input.pointerTargetX);

    // Firing
    if (this.input.fire) {
      if (this.powerups.has('confetti')) {
        const confetti = this.player.tryFireConfetti();
        if (confetti.length) { this.bullets.push(...confetti); this.sfx.shoot(); }
      } else if (this.powerups.has('multishot')) {
        const multi = this.player.tryFireMulti();
        if (multi.length) { this.bullets.push(...multi); this.sfx.shoot(); }
      } else if (this.powerups.has('spread')) {
        const spread = this.player.tryFireSpread();
        if (spread.length) { this.bullets.push(...spread); this.sfx.shoot(); }
      } else {
        const b = this.player.tryFire();
        if (b) { this.bullets.push(b); this.sfx.shoot(); }
      }
    }

    if (this.boss) this.simulateBoss(dt, def);
    else this.simulateSwarm(dt, def);

    // If scene changed mid-frame (e.g. advanceLevel → story), stop simulating
    if (this.scene !== 'play') return;

    // Bullets
    for (const b of this.bullets) b.update(dt);

    // Homing missiles + smoke trails
    for (const m of this.missiles) {
      m.update(dt, this.player.x, this.player.y);
      if (m.needsSmoke && m.alive) {
        this.particles.smoke(m.x, m.y + 6, 2, 'rgba(100,100,100,1)');
      }
    }
    this.missiles = this.missiles.filter(m => m.alive);

    // Landmines
    for (const mine of this.landmines) {
      mine.update(dt);
      if (mine.justExploded) {
        // BIG explosion with smoke!
        this.particles.bigExplosion(mine.x, mine.y);
        this.screenFlash.flash('#ff6b35', 0.4);
        this.shake = 0.35;
        this.sfx.mineExplode();

        // Damage player if close enough
        const dx = this.player.x - mine.x;
        const dy = this.player.y - mine.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60 && this.player.invuln <= 0) {
          if (!this.player.hasShield) {
            this.loseLife(false);
          } else {
            this.particles.burst(this.player.x, this.player.y, '#39ff14', 8, 80);
          }
        }

        // Damage nearby enemies too
        for (const e of this.enemies) {
          const edx = e.x - mine.x;
          const edy = e.y - mine.y;
          if (Math.sqrt(edx * edx + edy * edy) < 50) {
            e.alive = false;
            this.score += 50;
            this.particles.burst(e.x, e.y, '#ffb700', 10, 120);
            this.floatingTexts.add(e.x, e.y, '+50', '#ffb700', 12);
          }
        }
      }
    }
    this.landmines = this.landmines.filter(m => m.alive);

    // Powerups & events
    this.powerups.update(dt);
    this.events.update(dt);
    this.powerups.drawHud();

    // Time dilation
    if (this.powerups.has('timedilation')) {
      for (const b of this.bullets) {
        if (!b.fromPlayer) { b.vy *= 0.97; b.vx *= 0.97; }
      }
      for (const m of this.missiles) { m.vx *= 0.97; m.vy *= 0.97; }
    }

    this.resolveCollisions();
    this.bullets = this.bullets.filter((b) => b.alive);
    if (this.shake > 0) this.shake -= dt;
  }

  private applyPowerupEffects() {
    this.player.hasShield = this.powerups.has('shield');
    this.player.invertedControls = this.powerups.has('inverted');
    this.player.fireRateMult = this.powerups.has('rapidfire') ? 0.4 : this.powerups.has('slowfire') ? 2.5 : 1;
  }

  private simulateSwarm(dt: number, def: typeof LEVELS[number]) {
    this.swarmPhase += dt * 4;
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    const speedMult = this.events.enemySpeedMult;
    const fireMult = this.events.enemyFireMult;
    const speed = 24 * def.speed * (1 + (1 - this.enemies.length / (def.rows * def.cols)) * 1.5) * speedMult;

    for (const e of this.enemies) {
      e.x += this.swarmDir * speed * dt;
      e.applyPattern(dt, this.player.x);
      minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x); maxY = Math.max(maxY, e.y);
      if (Math.random() < def.fireRate * fireMult * dt) {
        this.bullets.push(new Bullet(e.x, e.y + e.h, 220 * def.bulletSpeed, false));
      }
      if (!e.kamikaze && this.enemies.length <= 2 && Math.random() < 0.01) {
        e.kamikaze = true;
      }
    }

    if ((minX < 35 && this.swarmDir < 0) || (maxX > VIEW.w - 35 && this.swarmDir > 0)) {
      this.swarmDir *= -1;
      for (const e of this.enemies) e.setY(e.y + 18);
    }
    if (maxY > this.player.y - 30) this.loseLife(true);
    if (this.enemies.length === 0) this.advanceLevel();
  }

  private simulateBoss(dt: number, _def: typeof LEVELS[number]) {
    if (!this.boss) return;
    this.bossFightTime += dt;
    const result = this.boss.update(dt);
    this.bullets.push(...result.bullets);
    this.missiles.push(...result.missiles);

    // Spawn landmines from boss
    for (const mine of this.boss.pendingMines) {
      this.landmines.push(new Landmine(mine.x, mine.y, rand(2.5, 4.5)));
    }
  }

  private resolveCollisions() {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      for (const s of this.shields) {
        if (b.y > VIEW.h - 200 && b.y < VIEW.h - 140 && s.hitAt(b.x, b.y)) { b.alive = false; break; }
      }
      if (!b.alive) continue;

      if (b.fromPlayer) {
        // Boss weak point
        if (this.boss && this.boss.weakPointActive) {
          const wp = this.boss.weakPointRect;
          if (wp && aabb(b.rect, wp)) {
            b.alive = false;
            this.boss.disableShield();
            this.score += 50;
            this.shake = 0.15;
            this.particles.burst(wp.x + wp.w / 2, wp.y + wp.h / 2, '#ffd700', 20, 180, 5);
            this.screenFlash.flash('#ffd700', 0.4);
            this.floatingTexts.add(wp.x + wp.w / 2, wp.y, 'SHIELD DOWN!', '#ffd700', 14);
            this.sfx.explode();
            continue;
          }
        }

        // Boss body
        if (this.boss && aabb(b.rect, this.boss.rect)) {
          b.alive = false;
          if (this.boss.vulnerable) {
            if (this.levelIndex === 2) {
              this.boss.hp = Math.max(1, this.boss.hp - 1);
            } else {
              this.boss.hp -= 1;
            }
            this.score += 5;
            this.shake = 0.05;
            this.particles.spark(b.x, b.y, '#ffb700', -Math.PI / 2, 8);
            this.particles.smoke(b.x, b.y, 2); // smoke on boss hit
            this.floatingTexts.add(b.x, b.y, '+5', '#ffb700', 12);
            this.sfx.hit();
            if (this.boss.hp <= 0) { this.boss.alive = false; this.bossDefeated(); }
          } else {
            this.particles.spark(b.x, b.y, '#00e5ff', -Math.PI / 2, 4);
          }
          continue;
        }

        // Boss clones
        if (this.boss) {
          for (const clone of this.boss.clones) {
            if (clone.alive && aabb(b.rect, clone.rect)) {
              b.alive = false;
              clone.alive = false;
              this.score += 25;
              this.particles.burst(clone.x, clone.y, '#ff2e63', 14, 120);
              this.particles.smoke(clone.x, clone.y, 6);
              this.floatingTexts.add(clone.x, clone.y, '+25', '#ff2e63', 12);
              this.sfx.explode();
              break;
            }
          }
          if (!b.alive) continue;
        }

        // Enemies
        for (const e of this.enemies) {
          if (e.alive && aabb(b.rect, e.rect)) {
            b.alive = false; e.hp -= 1;
            if (e.hp <= 0) {
              e.alive = false; this.score += 100;
              this.particles.burst(e.x, e.y, '#ff2e63', 16, 160);
              this.particles.smoke(e.x, e.y, 4); // smoke on enemy death
              this.floatingTexts.add(e.x, e.y, '+100', '#ff2e63', 14);
              this.sfx.explode();
            } else {
              this.sfx.hit();
              this.particles.spark(b.x, b.y, '#ffb700', -Math.PI / 2);
            }
            break;
          }
        }
      } else if (aabb(b.rect, this.player.rect) && this.player.invuln <= 0) {
        b.alive = false;
        if (this.player.hasShield) {
          this.particles.burst(this.player.x, this.player.y, '#39ff14', 8, 80);
          this.sfx.hit();
        } else {
          // Screen shake when player hit by weapon
          this.shake = 0.3;
          this.screenFlash.flash('#ff2e63', 0.25);
          this.loseLife(false);
        }
      }
    }

    // Homing missile collisions
    for (const m of this.missiles) {
      if (!m.alive) continue;
      if (aabb(m.rect, this.player.rect) && this.player.invuln <= 0) {
        m.alive = false;
        this.particles.bigExplosion(m.x, m.y); // smoke + fire on missile impact
        this.shake = 0.35;
        this.screenFlash.flash('#ff6b35', 0.35);
        if (this.player.hasShield) {
          this.sfx.hit();
        } else {
          this.loseLife(false);
        }
      }
      // Player bullets can destroy missiles
      for (const b of this.bullets) {
        if (b.alive && b.fromPlayer && aabb(b.rect, m.rect)) {
          b.alive = false;
          m.alive = false;
          this.score += 15;
          this.particles.burst(m.x, m.y, '#ff6b35', 10, 100);
          this.particles.smoke(m.x, m.y, 4);
          this.floatingTexts.add(m.x, m.y, '+15', '#ff6b35', 11);
          this.sfx.hit();
          break;
        }
      }
    }

    // Crate collisions
    for (const c of this.powerups.crates) {
      if (!c.alive) continue;
      if (aabb(c.rect, this.player.rect)) {
        c.alive = false;
        this.powerups.collect(c.type);
        const info = POWERUP_INFO[c.type];
        this.floatingTexts.add(c.x, c.y, info.name, info.color, 13);
        this.particles.spiral(c.x, c.y, info.color, 14);
        this.sfx.powerupCollect();

        if (c.type === 'blackhole') {
          for (const e of this.enemies) {
            if (e.alive) {
              e.alive = false; this.score += 100;
              this.particles.burst(e.x, e.y, '#b14bff', 12, 140);
              this.particles.smoke(e.x, e.y, 4);
            }
          }
          for (const b2 of this.bullets) { if (!b2.fromPlayer) b2.alive = false; }
          for (const m of this.missiles) m.alive = false;
          this.screenFlash.flash('#b14bff', 0.5);
          this.shake = 0.3;
          this.sfx.explode();
        }
        if (c.type === 'blindness') {
          this.screenFlash.flash('#fff', 0.8);
        }
      }
    }

    // Asteroid collisions
    for (const a of this.events.asteroids) {
      if (!a.alive) continue;
      if (aabb(a.rect, this.player.rect) && this.player.invuln <= 0) {
        a.alive = false;
        this.shake = 0.25;
        this.particles.burst(a.x, a.y, '#ffb700', 10, 120);
        this.particles.smoke(a.x, a.y, 6);
        if (!this.player.hasShield) this.loseLife(false);
      }
      for (const e of this.enemies) {
        if (e.alive && aabb(a.rect, e.rect)) {
          a.alive = false;
          e.alive = false;
          this.score += 50;
          this.particles.burst(e.x, e.y, '#ffb700', 14, 140);
          this.particles.smoke(e.x, e.y, 5);
          this.floatingTexts.add(e.x, e.y, '+50', '#ffb700', 12);
          break;
        }
      }
    }

    this.enemies = this.enemies.filter((e) => e.alive);
    this.updateHud();
  }

  private loseLife(invasion: boolean) {
    this.player.lives -= invasion ? this.player.lives : 1;
    this.player.invuln = 1.5;
    this.shake = 0.3;
    this.particles.burst(this.player.x, this.player.y, '#39ff14', 24, 200);
    this.particles.smoke(this.player.x, this.player.y, 8);
    this.screenFlash.flash('#ff2e63', 0.3);
    this.sfx.playerHit();
    this.updateHud();
    if (this.player.lives <= 0) void this.gameOver();
  }

  private advanceLevel() {
    this.score += 500;
    this.clearWarning(); // Fix: clear warning when level ends
    this.floatingTexts.add(VIEW.w / 2, VIEW.h / 2, '+500 LEVEL CLEAR!', '#39ff14', 20);
    if (this.levelIndex >= LEVELS.length - 1) { this.victory(); return; }
    this.levelIndex += 1;
    this.startLevel();
  }

  private bossDefeated() {
    this.particles.bigExplosion(this.boss!.x, this.boss!.y);
    this.particles.burst(this.boss!.x, this.boss!.y, '#39ff14', 40, 260, 6);
    this.particles.burst(this.boss!.x, this.boss!.y, '#ffd700', 30, 200, 5);
    this.particles.smoke(this.boss!.x, this.boss!.y, 20);
    this.screenFlash.flash('#fff', 0.7);
    this.shake = 0.5;
    this.sfx.mineExplode();
    this.sfx.explode();
    this.clearWarning();

    if (this.bossFightTime >= 120) {
      const name = this.lb.getName() || 'ACE';
      this.ui.setGuardian(name);
    }
    this.victory();
  }

  // ---- HUD + render -----------------------------------------------------

  private toggleHud(show: boolean) {
    document.getElementById('hud')?.classList.toggle('hidden', !show);
    document.getElementById('touch-controls')?.classList.toggle('hidden', !show);
    document.getElementById('footer')?.classList.toggle('hidden', show);
    if (!show) {
      document.getElementById('powerup-hud')?.classList.add('hidden');
      this.clearWarning();
    }
  }

  private updateHud() {
    const s = document.getElementById('hud-score');
    const l = document.getElementById('hud-level');
    const h = document.getElementById('hud-lives');
    if (s) s.textContent = `SCORE ${this.score}`;
    if (l) l.textContent = LEVELS[this.levelIndex]?.isBoss ? 'BOSS' : `LVL ${this.levelIndex + 1}`;
    if (h) h.textContent = '\u2665'.repeat(Math.max(0, this.player.lives));
  }

  private render(_dt: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW.w, VIEW.h);
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-5, 5), rand(-5, 5));
    this.stars.draw(ctx);

    if (this.scene === 'play') {
      for (const s of this.shields) s.draw(ctx);
      for (const e of this.enemies) e.draw(ctx, this.swarmPhase);
      this.boss?.draw(ctx);
      for (const m of this.missiles) m.draw(ctx);
      for (const mine of this.landmines) mine.draw(ctx);
      for (const b of this.bullets) b.draw(ctx);
      this.powerups.drawCrates(ctx);
      this.events.drawOverlay(ctx);
      this.player.draw(ctx);

      if (this.powerups.has('blindness')) {
        const t = performance.now() / 1000;
        ctx.fillStyle = `rgba(5, 6, 15, ${0.5 + Math.sin(t * 3) * 0.15})`;
        ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      }
    }

    this.particles.draw(ctx);
    this.floatingTexts.draw(ctx);
    this.screenFlash.draw(ctx);
    ctx.restore();
  }
}
