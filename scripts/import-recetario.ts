/**
 * Importa un recetario JSON (goals + ingredients + recipes) a la DB.
 * Los ingredientes se guardan como favoritos (macros por 100 g) y las recetas
 * se calculan desde los gramos. Idempotente por nombre: lo que ya existe se omite.
 *
 *   npx tsx scripts/import-recetario.ts <archivo.json> [--dry]
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

type Ingredient = {
  name: string;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  state: string;
};
type Recipe = {
  name: string;
  mealType: string;
  items: Array<{ ingredient: string; amountG: number }>;
};
type Payload = {
  goals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  ingredients: Ingredient[];
  recipes: Recipe[];
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const STATES = ["raw", "cooked", "unknown"];
const round2 = (n: number) => Math.round(n * 100) / 100;

const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error("Uso: npx tsx scripts/import-recetario.ts <archivo.json> [--dry]");
  process.exit(1);
}
const dry = flag === "--dry";
const data = JSON.parse(readFileSync(file, "utf8")) as Payload;

function validate() {
  const errors: string[] = [];
  const byName = new Map<string, Ingredient>();

  for (const i of data.ingredients) {
    if (byName.has(i.name)) errors.push(`Ingrediente duplicado: ${i.name}`);
    byName.set(i.name, i);
    if (!STATES.includes(i.state)) errors.push(`${i.name}: state inválido (${i.state})`);
    const est = 4 * i.protein100g + 4 * i.carbs100g + 9 * i.fat100g;
    const diff = Math.abs(est - i.kcal100g) / Math.max(i.kcal100g, 1);
    if (diff > 0.05) {
      errors.push(`${i.name}: kcal ${i.kcal100g} vs 4/4/9 = ${est.toFixed(0)} (${(diff * 100).toFixed(1)}%)`);
    }
  }

  const seen = new Set<string>();
  for (const r of data.recipes) {
    if (seen.has(r.name)) errors.push(`Receta duplicada: ${r.name}`);
    seen.add(r.name);
    if (!MEAL_TYPES.includes(r.mealType)) errors.push(`${r.name}: mealType inválido`);
    for (const it of r.items) {
      if (!byName.has(it.ingredient)) errors.push(`${r.name}: ingrediente no listado "${it.ingredient}"`);
      if (!(it.amountG > 0 && it.amountG <= 2000)) errors.push(`${r.name}: gramos fuera de rango (${it.amountG})`);
    }
  }
  return { errors, byName };
}

function totals(recipe: Recipe, byName: Map<string, Ingredient>) {
  return recipe.items.reduce(
    (t, it) => {
      const f = byName.get(it.ingredient)!;
      const k = it.amountG / 100;
      return {
        kcal: t.kcal + f.kcal100g * k,
        p: t.p + f.protein100g * k,
        c: t.c + f.carbs100g * k,
        g: t.g + f.fat100g * k,
      };
    },
    { kcal: 0, p: 0, c: 0, g: 0 }
  );
}

async function main() {
  const { errors, byName } = validate();

  console.log("receta | kcal | P | C | G");
  for (const r of data.recipes) {
    const t = totals(r, byName);
    console.log(`${r.mealType.padEnd(9)} ${r.name} | ${Math.round(t.kcal)} | ${t.p.toFixed(1)} | ${t.c.toFixed(1)} | ${t.g.toFixed(1)}`);
  }
  console.log(`\n${data.ingredients.length} ingredientes, ${data.recipes.length} recetas`);
  console.log(errors.length ? `\nAVISOS (${errors.length}):\n- ${errors.join("\n- ")}` : "\nSin errores de validación");

  if (dry) return;
  if (errors.some((e) => !e.includes("4/4/9"))) {
    console.error("\nHay errores estructurales; no se inserta nada.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const goal = await prisma.nutritionGoal.findFirst({ orderBy: { id: "asc" } });
    if (goal) await prisma.nutritionGoal.update({ where: { id: goal.id }, data: { ...data.goals, updatedAt: new Date() } });
    else await prisma.nutritionGoal.create({ data: data.goals });
    console.log("✓ Metas guardadas");

    const favIds = new Map<string, number>();
    let newFavs = 0;
    for (const i of data.ingredients) {
      const existing = await prisma.nutritionFavorite.findFirst({ where: { name: i.name } });
      if (existing) {
        favIds.set(i.name, existing.id);
        continue;
      }
      const fav = await prisma.nutritionFavorite.create({
        data: {
          name: i.name,
          kcal100g: i.kcal100g,
          protein100g: i.protein100g,
          carbs100g: i.carbs100g,
          fat100g: i.fat100g,
          defaultUnit: "g",
        },
      });
      favIds.set(i.name, fav.id);
      newFavs += 1;
    }
    console.log(`✓ Favoritos: ${newFavs} nuevos, ${data.ingredients.length - newFavs} ya existían`);

    let newRecipes = 0;
    for (const r of data.recipes) {
      if (await prisma.nutritionRecipe.findFirst({ where: { name: r.name } })) continue;
      await prisma.nutritionRecipe.create({
        data: {
          name: r.name,
          mealType: r.mealType,
          items: {
            create: r.items.map((it) => {
              const f = byName.get(it.ingredient)!;
              const k = it.amountG / 100;
              return {
                foodName: f.name,
                amountG: it.amountG,
                state: f.state,
                kcal: round2(f.kcal100g * k),
                proteinG: round2(f.protein100g * k),
                carbsG: round2(f.carbs100g * k),
                fatG: round2(f.fat100g * k),
                isEstimated: false,
              };
            }),
          },
        },
      });
      newRecipes += 1;
    }
    console.log(`✓ Recetas: ${newRecipes} nuevas, ${data.recipes.length - newRecipes} ya existían`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
