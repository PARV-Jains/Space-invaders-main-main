/**
 * Synth-based SFX + music using the Web Audio API.
 * Zero asset downloads => works offline. Space-themed suspense thriller BGM.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain = 0.06) {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  shoot() { this.blip(880, 0.08, 'square'); }
  hit() { this.blip(220, 0.12, 'sawtooth'); }
  explode() { this.blip(110, 0.3, 'sawtooth', 0.09); }
  playerHit() { this.blip(80, 0.4, 'triangle', 0.1); }
  levelUp() { this.blip(660, 0.15, 'square'); setTimeout(() => this.blip(990, 0.2, 'square'), 120); }
  click() { this.blip(600, 0.05, 'sine', 0.05); }

  /** Spaceship-style typewriter keystroke — short digital blip */
  typeClick() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = 1200 + Math.random() * 600; // slight pitch variation
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.03);
    g.gain.setValueAtTime(0.015, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Landmine/bomb explosion — deep rumble */
  mineExplode() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Deep boom
    const boom = ctx.createOscillator();
    const bG = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(80, now);
    boom.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    bG.gain.setValueAtTime(0.12, now);
    bG.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    boom.connect(bG).connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.55);
    // Crackle
    const crack = ctx.createOscillator();
    const cG = ctx.createGain();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(200, now);
    crack.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    cG.gain.setValueAtTime(0.06, now);
    cG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    crack.connect(cG).connect(ctx.destination);
    crack.start(now);
    crack.stop(now + 0.4);
  }

  intro() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const playTone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.05) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, idx) => { playTone(f, now + idx * 0.06, 0.15, 'square', 0.03); });
    const laserStart = now + notes.length * 0.06;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, laserStart);
    osc.frequency.exponentialRampToValueAtTime(150, laserStart + 0.4);
    g.gain.setValueAtTime(0.06, laserStart);
    g.gain.exponentialRampToValueAtTime(0.0001, laserStart + 0.4);
    osc.connect(g).connect(ctx.destination);
    osc.start(laserStart);
    osc.stop(laserStart + 0.4);
  }

  /* ---- Story music — suspense thriller cinematic ---- */

  private activeMusicNodes: AudioNode[] = [];
  private musicInterval: any = null;

  startStoryMusic() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (this.musicInterval) return;

    let step = 0;
    // Dark suspense chords — tension building
    const chords = [
      [65.41, 130.81, 155.56, 196.00],  // C minor — ominous
      [61.74, 123.47, 146.83, 185.00],  // Bb — creeping dread
      [73.42, 146.83, 174.61, 220.00],  // D — rising tension
      [55.00, 110.00, 138.59, 164.81],  // A minor — suspense
    ];

    const playChord = () => {
      const now = ctx.currentTime;
      const chord = chords[step % chords.length];

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        if (idx > 0) osc.detune.setValueAtTime((idx - 2) * 10, now);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(idx === 0 ? 0.03 : 0.018, now + 1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 4.6);
        osc.connect(g).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 4.8);
        this.activeMusicNodes.push(osc, g);
      });

      // Eerie high shimmer — like a distant signal in space
      const shimmer = ctx.createOscillator();
      const sG = ctx.createGain();
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(chord[3] * 3, now);
      shimmer.frequency.linearRampToValueAtTime(chord[3] * 3.05, now + 4.0);
      sG.gain.setValueAtTime(0, now);
      sG.gain.linearRampToValueAtTime(0.006, now + 2.0);
      sG.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
      shimmer.connect(sG).connect(ctx.destination);
      shimmer.start(now);
      shimmer.stop(now + 4.8);
      this.activeMusicNodes.push(shimmer, sG);

      // Suspense pulse — heartbeat-like low thud on every other step
      if (step % 2 === 0) {
        const pulse = ctx.createOscillator();
        const pG = ctx.createGain();
        pulse.type = 'sine';
        pulse.frequency.setValueAtTime(45, now + 0.5);
        pulse.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        pG.gain.setValueAtTime(0.04, now + 0.5);
        pG.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        pulse.connect(pG).connect(ctx.destination);
        pulse.start(now + 0.5);
        pulse.stop(now + 1.0);
        this.activeMusicNodes.push(pulse, pG);
      }

      step++;
      if (this.activeMusicNodes.length > 60) this.activeMusicNodes = this.activeMusicNodes.slice(-30);
    };

    playChord();
    this.musicInterval = setInterval(playChord, 4000);
  }

  stopStoryMusic() {
    if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; }
    this.activeMusicNodes.forEach(node => {
      try { if ('stop' in node) (node as any).stop(); node.disconnect(); } catch (e) {}
    });
    this.activeMusicNodes = [];
  }

  /* ---- Gameplay music — interstellar cruise with suspense edge ---- */

  private gameplayNodes: AudioNode[] = [];
  private gameplayInterval: any = null;

  startGameplayMusic() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.stopGameplayMusic();

    let step = 0;
    const arp = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 523.25, 440, 392, 329.63, 261.63];
    const bass = [110, 110, 130.81, 98.00, 110, 110, 146.83, 130.81];

    const playStep = () => {
      const now = ctx.currentTime;
      const bOsc = ctx.createOscillator();
      const bG = ctx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(bass[step % bass.length], now);
      bG.gain.setValueAtTime(0.035, now);
      bG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      bOsc.connect(bG).connect(ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + 0.4);

      const mOsc = ctx.createOscillator();
      const mG = ctx.createGain();
      mOsc.type = 'square';
      mOsc.frequency.setValueAtTime(arp[step % arp.length], now);
      mG.gain.setValueAtTime(0.018, now);
      mG.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      mOsc.connect(mG).connect(ctx.destination);
      mOsc.start(now);
      mOsc.stop(now + 0.22);

      if (step % 4 === 0) {
        const sparkle = ctx.createOscillator();
        const spG = ctx.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(arp[step % arp.length] * 2, now);
        spG.gain.setValueAtTime(0.012, now);
        spG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        sparkle.connect(spG).connect(ctx.destination);
        sparkle.start(now);
        sparkle.stop(now + 0.35);
        this.gameplayNodes.push(sparkle, spG);
      }

      this.gameplayNodes.push(bOsc, bG, mOsc, mG);
      step++;
      if (this.gameplayNodes.length > 50) this.gameplayNodes = this.gameplayNodes.slice(-25);
    };

    playStep();
    this.gameplayInterval = setInterval(playStep, 320);
  }

  stopGameplayMusic() {
    if (this.gameplayInterval) { clearInterval(this.gameplayInterval); this.gameplayInterval = null; }
    this.gameplayNodes.forEach(n => { try { if ('stop' in n) (n as any).stop(); n.disconnect(); } catch {} });
    this.gameplayNodes = [];
  }

  /* ---- Boss music — red alert ---- */

  private bossNodes: AudioNode[] = [];
  private bossInterval: any = null;

  startBossMusic() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.stopGameplayMusic();
    this.stopBossMusic();

    let step = 0;
    const drone = [55, 58.27, 51.91, 58.27, 55, 61.74, 55, 49.00];
    const siren = [220, 261.63, 293.66, 349.23, 329.63, 293.66, 261.63, 220,
                   207.65, 220, 261.63, 329.63, 349.23, 392, 349.23, 293.66];

    const playStep = () => {
      const now = ctx.currentTime;
      const dOsc = ctx.createOscillator();
      const dG = ctx.createGain();
      dOsc.type = 'sawtooth';
      dOsc.frequency.setValueAtTime(drone[step % drone.length], now);
      dG.gain.setValueAtTime(0.04, now);
      dG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      dOsc.connect(dG).connect(ctx.destination);
      dOsc.start(now);
      dOsc.stop(now + 0.24);

      const lOsc = ctx.createOscillator();
      const lG = ctx.createGain();
      lOsc.type = 'sawtooth';
      lOsc.frequency.setValueAtTime(siren[step % siren.length], now);
      lG.gain.setValueAtTime(0.022, now);
      lG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      lOsc.connect(lG).connect(ctx.destination);
      lOsc.start(now);
      lOsc.stop(now + 0.14);

      if (step % 2 === 0) {
        const kick = ctx.createOscillator();
        const kG = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(160, now);
        kick.frequency.exponentialRampToValueAtTime(25, now + 0.12);
        kG.gain.setValueAtTime(0.07, now);
        kG.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        kick.connect(kG).connect(ctx.destination);
        kick.start(now);
        kick.stop(now + 0.2);
        this.bossNodes.push(kick, kG);
      }

      if (step % 8 === 0) {
        const alarm = ctx.createOscillator();
        const aG = ctx.createGain();
        alarm.type = 'square';
        alarm.frequency.setValueAtTime(880, now);
        alarm.frequency.exponentialRampToValueAtTime(440, now + 0.2);
        aG.gain.setValueAtTime(0.015, now);
        aG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        alarm.connect(aG).connect(ctx.destination);
        alarm.start(now);
        alarm.stop(now + 0.3);
        this.bossNodes.push(alarm, aG);
      }

      this.bossNodes.push(dOsc, dG, lOsc, lG);
      step++;
      if (this.bossNodes.length > 60) this.bossNodes = this.bossNodes.slice(-30);
    };

    playStep();
    this.bossInterval = setInterval(playStep, 220);
  }

  stopBossMusic() {
    if (this.bossInterval) { clearInterval(this.bossInterval); this.bossInterval = null; }
    this.bossNodes.forEach(n => { try { if ('stop' in n) (n as any).stop(); n.disconnect(); } catch {} });
    this.bossNodes = [];
  }

  /* ---- One-shot jingles ---- */

  victoryJingle() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const fanfare = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.50];
    fanfare.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i < 4 ? 'square' : 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.1);
      g.gain.setValueAtTime(0.035, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
    const chordStart = now + fanfare.length * 0.1 + 0.05;
    [523.25, 659.25, 783.99, 1046.50].forEach(f => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, chordStart);
      g.gain.setValueAtTime(0.025, chordStart);
      g.gain.exponentialRampToValueAtTime(0.001, chordStart + 2.0);
      osc.connect(g).connect(ctx.destination);
      osc.start(chordStart);
      osc.stop(chordStart + 2.2);
    });
  }

  defeatSound() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 415.30, 349.23, 311.13, 261.63, 220, 174.61];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.22);
      g.gain.setValueAtTime(0.04 - i * 0.004, now + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.22 + 0.5);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.22);
      osc.stop(now + i * 0.22 + 0.55);
    });
    const drone = ctx.createOscillator();
    const dG = ctx.createGain();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(110, now + 1.6);
    drone.frequency.exponentialRampToValueAtTime(55, now + 3.2);
    dG.gain.setValueAtTime(0.03, now + 1.6);
    dG.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
    drone.connect(dG).connect(ctx.destination);
    drone.start(now + 1.6);
    drone.stop(now + 3.4);
  }

  powerupCollect() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    [659.25, 880, 1108.73, 1318.51].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.05);
      g.gain.setValueAtTime(0.04, now + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.2);
    });
  }

  warningAlert() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    [800, 500, 800, 500, 800].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now + i * 0.12);
      g.gain.setValueAtTime(0.025, now + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.1);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.12);
    });
  }

  stopAllMusic() {
    this.stopStoryMusic();
    this.stopGameplayMusic();
    this.stopBossMusic();
  }
}
