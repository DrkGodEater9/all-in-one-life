/**
 * Carga los pasos de preparación (y el tiempo total) en las recetas existentes, por nombre.
 *
 *   npx tsx scripts/cargar-pasos.ts
 */
import { PrismaClient } from "@prisma/client";
import { PASOS } from "./data/pasos-recetas";

async function main() {
  const prisma = new PrismaClient();
  try {
    const recipes = await prisma.nutritionRecipe.findMany({ select: { id: true, name: true } });
    const names = new Set(recipes.map((r) => r.name));
    for (const name of Object.keys(PASOS)) if (!names.has(name)) console.warn(`Sin receta para: ${name}`);

    let updated = 0;
    for (const r of recipes) {
      const pasos = PASOS[r.name];
      if (!pasos?.length) {
        console.warn(`Sin pasos: ${r.name}`);
        continue;
      }
      await prisma.nutritionRecipe.update({
        where: { id: r.id },
        data: {
          steps: pasos.map(([text, minutes]) => ({ text, minutes: minutes ?? null })),
          prepMinutes: pasos.reduce((t, [, m]) => t + (m ?? 0), 0) || null,
        },
      });
      updated += 1;
    }
    console.log(`✓ Pasos cargados en ${updated} de ${recipes.length} recetas`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
