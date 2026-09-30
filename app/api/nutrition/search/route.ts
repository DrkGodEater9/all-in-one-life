import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import {
  num,
  numOrNull,
  searchOpenFoodFacts,
  type FoodResult,
} from "../_shared";

const querySchema = z.object({
  q: z.string().trim().min(2, "Escribe al menos 2 caracteres").max(80),
});

/**
 * GET /api/nutrition/search?q=
 *
 * 1. Favoritos + caché local (match por nombre).
 * 2. OpenFoodFacts, normalizado por 100 g.
 * 3. Los nuevos se cachean por `offId`.
 *
 * Si OpenFoodFacts falla o tarda, la ruta devuelve igualmente lo local.
 */
export const GET = withAuth(async ({ searchParams }) => {
  const { q } = querySchema.parse({ q: searchParams.get("q") ?? "" });

  const [favorites, cached] = await Promise.all([
    prisma.nutritionFavorite.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: 10,
    }),
    prisma.nutritionFoodCache.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      orderBy: { cachedAt: "desc" },
      take: 20,
    }),
  ]);

  const results: FoodResult[] = [];
  const seenOffIds = new Set<string>();

  for (const f of favorites) {
    results.push({
      key: `fav-${f.id}`,
      source: "favorite",
      foodCacheId: null,
      favoriteId: f.id,
      offId: null,
      name: f.name,
      kcal100g: num(f.kcal100g),
      protein100g: num(f.protein100g),
      carbs100g: num(f.carbs100g),
      fat100g: num(f.fat100g),
    });
  }

  for (const c of cached) {
    if (c.offId) seenOffIds.add(c.offId);
    results.push({
      key: `cache-${c.id}`,
      source: "cache",
      foodCacheId: c.id,
      favoriteId: null,
      offId: c.offId,
      name: c.name,
      kcal100g: num(c.kcal100g),
      protein100g: num(c.protein100g),
      carbs100g: num(c.carbs100g),
      fat100g: num(c.fat100g),
    });
  }

  const remote = await searchOpenFoodFacts(q);
  const fresh = remote.filter((p) => !seenOffIds.has(p.offId));

  if (fresh.length > 0) {
    const upserted = await Promise.allSettled(
      fresh.map((p) =>
        prisma.nutritionFoodCache.upsert({
          where: { offId: p.offId },
          update: {
            name: p.name,
            kcal100g: p.kcal100g,
            protein100g: p.protein100g,
            carbs100g: p.carbs100g,
            fat100g: p.fat100g,
            cachedAt: new Date(),
          },
          create: {
            offId: p.offId,
            name: p.name,
            kcal100g: p.kcal100g,
            protein100g: p.protein100g,
            carbs100g: p.carbs100g,
            fat100g: p.fat100g,
          },
        })
      )
    );

    for (const r of upserted) {
      if (r.status !== "fulfilled") continue;
      const c = r.value;
      results.push({
        key: `cache-${c.id}`,
        source: "off",
        foodCacheId: c.id,
        favoriteId: null,
        offId: c.offId,
        name: c.name,
        kcal100g: num(c.kcal100g),
        protein100g: numOrNull(c.protein100g) ?? 0,
        carbs100g: numOrNull(c.carbs100g) ?? 0,
        fat100g: numOrNull(c.fat100g) ?? 0,
      });
    }
  }

  return ok(results.slice(0, 40));
});
