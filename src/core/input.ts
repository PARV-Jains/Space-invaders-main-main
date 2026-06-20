import { VIEW } from './types';

/**
 * Unified input for keyboard + touch. Exposes a simple polled state
 * (left/right/fire) so the game loop stays deterministic and lightweight.
 */
export class Input {
  left = false;
  right = false;
  fire = false;
  /** Absolute target X (virtual units) when dragging on touch; null if unused. */
  pointerTargetX: number | null = null;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindKeyboard();
    this.bindTouchButtons();
    this.bindCanvasDrag();
  }

  private bindKeyboard() {
    const set = (e: KeyboardEvent, down: boolean) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA': this.left = down; break;
        case 'ArrowRight':
        case 'KeyD': this.right = down; break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW': this.fire = down; if (down) e.preventDefault(); break;
      }
    };
    window.addEventListener('keydown', (e) => set(e, true));
    window.addEventListener('keyup', (e) => set(e, false));
  }

  private bindTouchButtons() {
    const hook = (id: string, on: (v: boolean) => void) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e: Event) => { e.preventDefault(); on(true); };
      const end = (e: Event) => { e.preventDefault(); on(false); };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('touchcancel', end, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
    };
    hook('btn-left', (v) => (this.left = v));
    hook('btn-right', (v) => (this.right = v));
    hook('btn-fire', (v) => (this.fire = v));
  }

  /** Optional drag-to-move directly on the play field. */
  private bindCanvasDrag() {
    const toVirtualX = (clientX: number) => {
      const r = this.canvas.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * VIEW.w;
    };
    const move = (clientX: number) => { this.pointerTargetX = toVirtualX(clientX); };
    const clear = () => { this.pointerTargetX = null; };
    this.canvas.addEventListener('touchstart', (e) => { if (e.touches[0]) move(e.touches[0].clientX); }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => { if (e.touches[0]) move(e.touches[0].clientX); }, { passive: true });
    this.canvas.addEventListener('touchend', clear);
  }
}
