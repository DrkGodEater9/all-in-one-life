/**
 * Datos base que la app asume que existen.
 * Idempotente: se puede correr las veces que haga falta.
 *
 *   npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Las dos fuentes de dinero del módulo de finanzas.
  for (const name of ["daily", "savings"]) {
    const existing = await prisma.financeSource.findFirst({ where: { name } });
    if (!existing) {
      await prisma.financeSource.create({ data: { name, balance: 0 } });
      console.log(`✓ FinanceSource "${name}" creada`);
    }
  }

  // Una única fila de metas nutricionales.
  const goal = await prisma.nutritionGoal.findFirst();
  if (!goal) {
    await prisma.nutritionGoal.create({
      data: { kcal: 2000, proteinG: 150, carbsG: 200, fatG: 65 },
    });
    console.log("✓ NutritionGoal por defecto creada");
  }

  // Categorías de proyectos de arranque.
  for (const name of ["Software", "Negocio", "Personal"]) {
    await prisma.projectCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✓ Categorías de proyectos listas");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
