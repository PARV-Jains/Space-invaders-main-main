import { Leaderboard } from '../core/leaderboard';
import { Sfx } from '../core/audio';
import { StoryBeat, SKIP_TEXT } from './levels';

const GUARDIAN_KEY = 'nv_sector_guardian';

/** Builds DOM overlay screens. Keeps all menu/story/leaderboard markup in one place. */
export class UI {
  private root: HTMLElement;
  constructor(private lb: Leaderboard, private sfx: Sfx) {
    this.root = document.getElementById('overlay')!;
  }

  clear() { this.root.innerHTML = ''; }

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  menu(onPlay: () => void, onLeaderboard: () => void) {
    this.clear();
    this.root.appendChild(this.el('p', 'subtitle', 'A last-stand space shooter'));
    this.root.appendChild(this.el('h1', 'title', 'NEBULA VANGUARD'));

    // Sector Guardian badge
    const guardian = this.getGuardian();
    if (guardian) {
      const badge = this.el('div', 'sector-guardian');
      badge.innerHTML = `<span class="guardian-label">⟐ SECTOR GUARDIAN ⟐</span><span class="guardian-name">${guardian}</span>`;
      this.root.appendChild(badge);
    }

    const play = this.el('button', 'menu-btn', 'START MISSION');
    play.id = 'btn-start-mission';
    play.onclick = onPlay;
    const lb = this.el('button', 'menu-btn secondary', 'LEADERBOARD');
    lb.id = 'btn-leaderboard';
    lb.onclick = onLeaderboard;
    this.root.append(play, lb);
    const hint = this.el('p', 'hint', 'Move: \u2190 \u2192 / A D / drag  \u2022  Fire: Space / tap');
    this.root.appendChild(hint);
  }

  story(beats: StoryBeat[], done: () => void) {
    let i = 0;
    const render = () => {
      this.clear();
      const beat = beats[i];
      const boss = beat.speaker === '???';

      const speakerEl = this.el('p', boss ? 'speaker boss-warning' : 'speaker', beat.speaker);
      this.root.appendChild(speakerEl);

      // Typewriter animation with sound
      const textEl = this.el('p', 'story-text typewriter');
      this.root.appendChild(textEl);
      this.typewrite(textEl, beat.text, 30);

      // Buttons
      const btnRow = this.el('div', 'story-btn-row');
      const next = this.el('button', 'menu-btn', i < beats.length - 1 ? 'NEXT' : 'CONTINUE');
      next.onclick = () => {
        i += 1;
        if (i < beats.length) render();
        else { this.clear(); done(); }
      };
      const skip = this.el('button', 'menu-btn secondary skip-btn', SKIP_TEXT);
      skip.onclick = () => { this.clear(); done(); };
      btnRow.append(next, skip);
      this.root.appendChild(btnRow);
    };
    if (beats.length === 0) { done(); return; }
    render();
  }

  private typewrite(el: HTMLElement, text: string, speed: number) {
    let idx = 0;
    let charCounter = 0;
    el.textContent = '';
    const interval = setInterval(() => {
      if (idx < text.length) {
        el.textContent += text[idx];
        // Play typing sound every 2nd char (not every char = too noisy)
        charCounter++;
        if (charCounter % 2 === 0 && text[idx] !== '\n' && text[idx] !== ' ') {
          this.sfx.typeClick();
        }
        idx++;
      } else {
        clearInterval(interval);
        el.classList.remove('typewriter');
      }
    }, speed);
    // Click to skip typewriter
    el.onclick = () => {
      clearInterval(interval);
      el.textContent = text;
      el.classList.remove('typewriter');
      el.onclick = null;
    };
  }

  async gameOver(
    score: number,
    level: number,
    onMenu: () => void,
    onLeaderboard: () => void,
    alreadySubmitted = false,
    onSubmit?: () => void
  ) {
    this.clear();
    this.root.appendChild(this.el('h1', 'title gameover-title', 'GAME OVER'));
    this.root.appendChild(this.el('p', 'subtitle', `Score ${score} \u2022 Reached level ${level}`));

    const rankTitle = this.getRankTitle(score);
    const rankEl = this.el('p', `rank-title ${rankTitle.cls}`, rankTitle.title);
    this.root.appendChild(rankEl);

    const input = this.el('input', 'name-input') as HTMLInputElement;
    input.placeholder = 'CALLSIGN';
    input.maxLength = 16;
    input.value = this.lb.getName();
    this.root.appendChild(input);

    const status = this.el('p', 'lb-status', alreadySubmitted ? 'Score recorded!' : '');
    const submit = this.el('button', 'menu-btn', 'SUBMIT SCORE');
    submit.id = 'btn-submit-score';
    if (alreadySubmitted) submit.disabled = true;
    submit.onclick = async () => {
      const name = (input.value || 'ANON').toUpperCase();
      this.lb.setName(name);
      submit.disabled = true;
      status.textContent = this.lb.online && this.lb.configured ? 'Uploading\u2026' : 'Saved offline \u2014 will sync later.';
      try {
        await this.lb.submit({ player: name, score, level });
        status.textContent = 'Score recorded!';
        if (onSubmit) onSubmit();
      } catch (err) {
        console.error(err);
        status.textContent = 'Failed to submit score.';
        submit.disabled = false;
      }
    };
    const menu = this.el('button', 'menu-btn secondary', 'MAIN MENU');
    menu.id = 'btn-main-menu';
    menu.onclick = onMenu;
    const view = this.el('button', 'menu-btn secondary', 'LEADERBOARD');
    view.onclick = onLeaderboard;
    this.root.append(submit, status, view, menu);
  }

  async leaderboard(onBack: () => void) {
    this.clear();
    this.root.appendChild(this.el('h1', 'title', 'TOP ACES'));
    const status = this.el('p', 'lb-status', 'Loading\u2026');
    this.root.appendChild(status);
    
    const back = this.el('button', 'menu-btn', 'BACK');
    back.id = 'btn-lb-back';
    back.onclick = onBack;
    this.root.appendChild(back);

    try {
      const { entries, source } = await this.lb.top(10);
      status.textContent = source === 'online' ? 'Global leaderboard' : 'Local scores (offline)';
      const table = this.el('table', 'leaderboard');
      const head = this.el('tr');
      ['#', 'Pilot', 'Score', 'Title'].forEach((h) => head.appendChild(this.el('th', '', h)));
      table.appendChild(head);
      entries.forEach((e, idx) => {
        const tr = this.el('tr');
        tr.appendChild(this.el('td', '', String(idx + 1)));
        tr.appendChild(this.el('td', '', e.player));
        tr.appendChild(this.el('td', '', String(e.score)));
        const rank = this.getRankTitle(e.score);
        const titleCell = this.el('td', `rank-title-cell ${rank.cls}`, rank.title);
        tr.appendChild(titleCell);
        table.appendChild(tr);
      });
      if (entries.length === 0) status.textContent += ' \u2014 no scores yet. Be the first!';
      this.root.insertBefore(table, back);
    } catch (err) {
      console.error(err);
      status.textContent = 'Error loading leaderboard. Please try again.';
    }
  }

  private getRankTitle(score: number): { title: string; cls: string } {
    if (score >= 100000) return { title: 'GDGoC God Mode', cls: 'rank-god' };
    if (score >= 5000)  return { title: 'Chai Sutta Corner Legend', cls: 'rank-legend' };
    if (score >= 1500)  return { title: 'Syllabus Survivor', cls: 'rank-survivor' };
    return { title: 'Canteen Debtor', cls: 'rank-canteen' };
  }

  setGuardian(name: string) { localStorage.setItem(GUARDIAN_KEY, name); }
  getGuardian(): string | null { return localStorage.getItem(GUARDIAN_KEY); }
}
