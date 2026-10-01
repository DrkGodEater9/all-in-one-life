import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequest, notFound } from "@/lib/http";
import { parseDateKey, toDateKey } from "@/lib/utils";
import { computeStreak, STREAK_MODES, type StreakMode } from "@/lib/streaks";

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido, se espera YYYY-MM-DD");

export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido");

export const streakSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre").max(60),
  color: colorSchema.default("#8b5cf6"),
  mode: z.enum(STREAK_MODES as [StreakMode, ...StreakMode[]]),
});

export function parseId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("id inválido");
  return id;
}

/** Fecha de una columna @db.Date → 'YYYY-MM-DD'. */
const keyOf = (d: Date) => d.toISOString().slice(0, 10);

export { parseDateKey, toDateKey, notFound, prisma };

type StreakRow = {
  id: number;
  name: string;
  color: string;
  mode: string;
  createdAt: Date;
  checkins: { date: Date }[];
};

export function withStats(row: StreakRow, today: string) {
  const { checkins, ...rest } = row;
  return {
    ...rest,
    ...computeStreak(row.mode as StreakMode, checkins.map((c) => keyOf(c.date)), today),
  };
}
