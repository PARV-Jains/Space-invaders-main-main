import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ScoreEntry {
  player: string;
  score: number;
  level: number;
  created_at?: string;
}

const QUEUE_KEY = 'nv_pending_scores';
const NAME_KEY = 'nv_player_name';
const LOCAL_BEST_KEY = 'nv_local_scores';

/**
 * Offline-first leaderboard.
 * - Reads/writes a global board in Supabase when online.
 * - When offline (or on failure), scores are queued in localStorage and flushed
 *   automatically when connectivity returns, so gameplay never blocks on the network.
 */
export class Leaderboard {
  private client: SupabaseClient | null = null;
  readonly table = 'leaderboard';

  constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && key && !url.includes('YOUR-PROJECT')) {
      this.client = createClient(url, key, { auth: { persistSession: false } });
    } else {
      console.warn('[leaderboard] Supabase not configured; running in local-only mode.');
    }
    window.addEventListener('online', () => void this.flushQueue());
  }

  get online(): boolean { return navigator.onLine; }
  get configured(): boolean { return this.client !== null; }

  getName(): string { return localStorage.getItem(NAME_KEY) ?? ''; }
  setName(name: string) { localStorage.setItem(NAME_KEY, name.slice(0, 16)); }

  /** Submit a score. Tries the network, falls back to a local queue. */
  async submit(entry: ScoreEntry): Promise<void> {
    this.recordLocalBest(entry);
    if (!this.client || !this.online) {
      this.queue(entry);
      return;
    }
    const { error } = await this.client.from(this.table).insert(entry);
    if (error) {
      console.warn('[leaderboard] insert failed, queuing:', error.message);
      this.queue(entry);
    }
  }

  /** Fetch top scores. Falls back to local scores when offline/unconfigured. */
  async top(limit = 10): Promise<{ entries: ScoreEntry[]; source: 'online' | 'local' }> {
    if (this.client && this.online) {
      const { data, error } = await this.client
        .from(this.table)
        .select('player, score, level, created_at')
        .order('score', { ascending: false })
        .limit(limit);
      if (!error && data) return { entries: data as ScoreEntry[], source: 'online' };
    }
    return { entries: this.localBest(limit), source: 'local' };
  }

  private queue(entry: ScoreEntry) {
    const q = this.readQueue();
    q.push(entry);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  }

  private readQueue(): ScoreEntry[] {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]'); } catch { return []; }
  }

  async flushQueue(): Promise<void> {
    if (!this.client || !this.online) return;
    const q = this.readQueue();
    if (q.length === 0) return;
    const { error } = await this.client.from(this.table).insert(q);
    if (!error) localStorage.removeItem(QUEUE_KEY);
  }

  private recordLocalBest(entry: ScoreEntry) {
    const all = this.localBest(100);
    all.push({ ...entry, created_at: new Date().toISOString() });
    all.sort((a, b) => b.score - a.score);
    localStorage.setItem(LOCAL_BEST_KEY, JSON.stringify(all.slice(0, 50)));
  }

  private localBest(limit: number): ScoreEntry[] {
    try {
      const all: ScoreEntry[] = JSON.parse(localStorage.getItem(LOCAL_BEST_KEY) ?? '[]');
      return all.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch { return []; }
  }
}
