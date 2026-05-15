/**
 * Rate limit en memoria por usuario para POST /api/analyses (MVP).
 * En serverless cada instancia tiene su propio contador; sigue siendo útil contra abuso casual.
 */

type WindowState = { timestamps: number[] };

const buckets = new Map<string, WindowState>();

/** Máximo de análisis por ventana de tiempo por usuario (sesión). */
const MAX_PER_WINDOW = 8;
const WINDOW_MS = 60_000;

function prune(now: number, timestamps: number[]): number[] {
  return timestamps.filter((t) => now - t < WINDOW_MS);
}

export type AnalysisPostRateResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Registra un intento y devuelve si está permitido. Si no, estima segundos hasta la próxima ventana.
 */
export function consumeAnalysisPostSlot(userId: string): AnalysisPostRateResult {
  const now = Date.now();
  const state = buckets.get(userId) ?? { timestamps: [] };
  const fresh = prune(now, state.timestamps);
  if (fresh.length >= MAX_PER_WINDOW) {
    const oldest = fresh[0]!;
    const retryAfterMs = WINDOW_MS - (now - oldest);
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    state.timestamps = fresh;
    buckets.set(userId, state);
    return { ok: false, retryAfterSec };
  }
  fresh.push(now);
  state.timestamps = fresh;
  buckets.set(userId, state);
  return { ok: true };
}
