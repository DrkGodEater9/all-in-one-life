/**
 * Asigna a un usuario todas las filas que aún no tienen dueño (`userId = ''`).
 * Se corre UNA vez, justo después de `npm run db:push` con el esquema
 * multiusuario, para que los datos que ya existían queden a nombre de su dueño.
 *
 *   SEED_USER_ID=<uuid de auth.users> npx tsx --env-file=.env scripts/backfill-user.ts
 *
 * Idempotente: solo toca filas con userId vacío, así que repetirlo no mueve
 * datos de otros usuarios.
 */
import { prismaAdmin as prisma } from "../lib/db";

const userId = process.env.SEED_USER_ID;
if (!userId) {
  console.error("Falta SEED_USER_ID (Supabase > Authentication > Users > UID)");
  process.exit(1);
}

const TABLES = [
  "RecurrenceRule", "FinanceSource", "FinanceAsset", "FinanceCreditLine", "Streak",
  "NutritionFavorite", "NutritionMealLog", "NutritionRecipe", "NutritionGoal",
  "NutritionWeightLog", "NutritionWaterLog", "NutritionProduct", "GymRoutine",
  "GymMeasurement", "CalendarEvent", "TaskLabel", "Task", "ProjectCategory",
  "Project", "ProjectTag", "BlogPost", "Concept",
];

async function main() {
  const [user] = await prisma.$queryRawUnsafe<{ id: string; email: string }[]>(
    `select id::text, email from auth.users where id::text = $1`,
    userId
  );
  if (!user) throw new Error(`No existe un usuario ${userId} en auth.users`);
  console.log(`Usuario: ${user.email}`);

  for (const table of TABLES) {
    const count = await prisma.$executeRawUnsafe(
      `update "${table}" set "userId" = $1 where "userId" = ''`,
      userId
    );
    console.log(`${table}: ${count} filas`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
