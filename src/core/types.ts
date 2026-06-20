export interface Vec2 { x: number; y: number; }

export interface Rect { x: number; y: number; w: number; h: number; }

export function aabb(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Logical (virtual) resolution the game is designed against. The canvas scales to fit. */
export const VIEW = { w: 480, h: 800 };

export type Scene = 'menu' | 'story' | 'play' | 'gameover' | 'leaderboard' | 'victory';
