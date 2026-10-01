/**
 * Lógica pura de rachas (la comparten la API y la UI).
 *
 * Dos modos:
 * - `daily`: hay que cumplir todos los días. Máximo 1 día entre check-ins
 *   consecutivos (sin huecos).
 * - `alternate` (día sí, día no): se permite UN día de descanso entre
 *   check-ins. Si pasan dos días seguidos sin cumplir, se pierde.
 *
 * Todo trabaja con claves 'YYYY-MM-DD' (el día local del usuario), así que
 * no depende de husos horarios.
 */
export type StreakMode = "daily" | "alternate";

export const STREAK_MODES: StreakMode[] = ["daily", "alternate"];

/** Días máximos permitidos entre dos check-ins consecutivos de la misma racha. */
const MAX_GAP: Record<StreakMode, number> = { daily: 1, alternate: 2 };

const MS_DAY = 86_400_000;

function dayIndex(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
}

export interface StreakStats {
  /** Racha viva hoy (0 si se perdió o nunca se empezó). */
  current: number;
  /** Mejor racha histórica. */
  best: number;
  doneToday: boolean;
  /** Último día cumplido, o null. */
  lastDate: string | null;
  /**
   * - `done`: ya cumpliste hoy.
   * - `due`: hoy toca cumplir para no perderla (daily, o alternate tras descansar).
   * - `rest`: modo alternate, hoy es día de descanso (cumplir es opcional).
   * - `lost`: se perdió; cumplir hoy empieza una nueva.
   * - `new`: aún sin check-ins.
   */
  status: "done" | "due" | "rest" | "lost" | "new";
}

export function computeStreak(mode: StreakMode, dateKeys: string[], today: string): StreakStats {
  const days = Array.from(new Set(dateKeys.map(dayIndex))).sort((a, b) => a - b);
  const todayIdx = dayIndex(today);
  const gap = MAX_GAP[mode];

  if (days.length === 0) {
    return { current: 0, best: 0, doneToday: false, lastDate: null, status: "new" };
  }

  // Cadenas: se parte cuando el hueco supera el máximo permitido.
  let best = 0;
  let chain = 0;
  let prev: number | null = null;
  for (const d of days) {
    chain = prev !== null && d - prev <= gap ? chain + 1 : 1;
    best = Math.max(best, chain);
    prev = d;
  }

  const last = days[days.length - 1];
  const sinceLast = todayIdx - last;
  const doneToday = sinceLast === 0;
  // Viva si el próximo check-in todavía llega a tiempo (hoy incluido).
  const alive = sinceLast <= gap;
  const current = alive ? chain : 0;

  let status: StreakStats["status"];
  if (doneToday) status = "done";
  else if (!alive) status = "lost";
  else if (mode === "alternate" && sinceLast < gap) status = "rest";
  else status = "due";

  const lastDate = new Date(last * MS_DAY).toISOString().slice(0, 10);
  return { current, best, doneToday, lastDate, status };
}
