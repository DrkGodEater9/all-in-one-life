import type { StreakMode, StreakStats } from "@/lib/streaks";

/** Forma que devuelve `/api/streaks`. */
export interface Streak extends StreakStats {
  id: number;
  name: string;
  color: string;
  mode: StreakMode;
  createdAt: string;
}
