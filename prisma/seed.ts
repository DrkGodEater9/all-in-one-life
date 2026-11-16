/**
 * Datos base que la app asume que existen.
 * Idempotente: se puede correr las veces que haga falta.
 *
 *   SEED_USER_ID=<uuid de auth.users> npx tsx prisma/seed.ts
 *
 * Es por usuario: los datos base se crean para el usuario indicado. (La app
 * también los crea sola la primera vez que un usuario entra a cada módulo.)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const userId = process.env.SEED_USER_ID ?? "";
if (!userId) {
  console.error("Falta SEED_USER_ID (el id del usuario en Supabase > Authentication)");
  process.exit(1);
}

async function main() {
  // Las dos fuentes de dinero del módulo de finanzas.
  for (const name of ["daily", "savings"]) {
    const existing = await prisma.financeSource.findFirst({ where: { userId, name } });
    if (!existing) {
      await prisma.financeSource.create({ data: { userId, name, balance: 0 } });
      console.log(`✓ FinanceSource "${name}" creada`);
    }
  }

  // Una única fila de metas nutricionales.
  const goal = await prisma.nutritionGoal.findFirst({ where: { userId } });
  if (!goal) {
    await prisma.nutritionGoal.create({
      data: { userId, kcal: 2000, proteinG: 150, carbsG: 200, fatG: 65 },
    });
    console.log("✓ NutritionGoal por defecto creada");
  }

  // Categorías de proyectos de arranque.
  for (const name of ["Software", "Negocio", "Personal"]) {
    await prisma.projectCategory.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name },
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
