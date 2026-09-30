import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey } from "@/lib/utils";
import { dateKeySchema, dbDateKey, shiftDateKey, todayKey } from "../_shared";

const LOOKBACK_DAYS = 400;

/**
 * GET /api/nutrition/streak?date=
 *
 * Días consecutivos hasta hoy con al menos un item registrado.
 * Si hoy todavía no hay nada, la racha se cuenta desde ayer: el día en curso
 * no debe romperla antes de la primera comida.
 *
 * `date` es opcional y cae a `todayKey()` (UTC del servidor) si falta, pero
 * el cliente SIEMPRE debe mandar su día local: en husos negativos (Bogotá,
 * UTC-5) el UTC del servidor ya es "mañana" entre las 19:00 y medianoche
 * hora local, así que sin este parámetro `loggedToday` sale falso aunque el
 * usuario acabe de registrar algo. Mismo patrón que `readDateParam`.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const rawDate = searchParams.get("date");
  const today = rawDate ? dateKeySchema.parse(rawDate) : todayKey();
  const from = parseDateKey(shiftDateKey(today, -LOOKBACK_DAYS));

  const meals = await prisma.nutritionMealLog.findMany({
    where: { date: { gte: from }, items: { some: {} } },
    select: { date: true },
  });

  const logged = new Set(meals.map((m) => dbDateKey(m.date)));

  const loggedToday = logged.has(today);
  let cursor = loggedToday ? today : shiftDateKey(today, -1);
  let streak = 0;

  while (logged.has(cursor) && streak < LOOKBACK_DAYS) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return ok({ streak, loggedToday, lastLoggedDate: loggedToday ? today : null });
});
