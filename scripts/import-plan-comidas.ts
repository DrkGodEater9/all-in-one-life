/**
 * Importa un plan de comidas JSON (metas_diarias + grupos + recetas con pasos,
 * costos y macros por porción) al tablero de recetas. Idempotente por nombre:
 * las recetas que ya existen se omiten.
 *
 *   npx tsx scripts/import-plan-comidas.ts <archivo.json> [--dry]
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

type Ingredient = {
  ingrediente: string;
  cantidad: number | null;
  unidad: string;
  tienda?: string;
  peso_g?: number;
  peso_cocido_g?: number;
  costo_estimado_cop?: number;
};
type Recipe = {
  id: string;
  nombre: string;
  grupo: string;
  comida: string;
  porciones_que_rinde?: number;
  tiempo_total_min?: number;
  ingredientes: Ingredient[];
  pasos?: Array<{ texto: string; minutos?: number }>;
  macros_por_porcion: { kcal: number; proteina_g: number; carbohidratos_g: number; grasa_g: number };
  precio_por_porcion_cop?: number;
  guardado?: string;
  dias_en_nevera?: number;
  consejos?: string[];
  notas?: string[];
};
type Payload = {
  metas_diarias?: { kcal: number; proteina_g_objetivo: number; carbohidratos_g: number; grasa_g: number };
  grupos: Array<{ id: string; nombre: string }>;
  recetas: unknown;
};

const MEAL: Record<string, string> = { desayuno: "breakfast", almuerzo: "lunch", cena: "dinner", snack: "snack" };
const [file, flag] = process.argv.slice(2);
if (!file) {
  console.error("Uso: npx tsx scripts/import-plan-comidas.ts <archivo.json> [--dry]");
  process.exit(1);
}
const dry = flag === "--dry";
const data = JSON.parse(readFileSync(file, "utf8")) as Payload;

/** Recorre `recetas` (anidado por comida y grupo) y junta todo lo que parezca una receta. */
function collect(node: unknown, out: Recipe[] = []): Recipe[] {
  if (Array.isArray(node)) node.forEach((n) => collect(n, out));
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.id === "string" && Array.isArray(o.ingredientes)) out.push(o as unknown as Recipe);
    else Object.values(o).forEach((n) => collect(n, out));
  }
  return out;
}

/** Gramos aproximados de un ingrediente; lo que no se puede pesar queda fuera. */
function gramsOf(i: Ingredient): number | null {
  if (i.cantidad == null) return null;
  if (i.tienda?.startsWith("Básicos") && !i.costo_estimado_cop) return null;
  if (i.peso_g) return i.peso_g;
  if (i.peso_cocido_g) return i.peso_cocido_g;
  if (i.unidad === "g" || i.unidad === "ml") return i.cantidad;
  if (i.unidad === "und" && /huevo/i.test(i.ingrediente)) return i.cantidad * 50;
  if (i.unidad === "lata") return i.cantidad * 120;
  return i.cantidad * 100;
}

async function main() {
  const recipes = collect(data.recetas);
  const groups = new Map(data.grupos.map((g) => [g.id, g.nombre]));
  const errors: string[] = [];

  for (const r of recipes) {
    if (!MEAL[r.comida]) errors.push(`${r.id}: comida desconocida (${r.comida})`);
    if (!groups.has(r.grupo)) errors.push(`${r.id}: grupo sin definir (${r.grupo})`);
    if (!r.macros_por_porcion) errors.push(`${r.id}: sin macros_por_porcion`);
  }

  for (const r of recipes) {
    const m = r.macros_por_porcion;
    console.log(`${r.id} ${r.nombre} | ${m.kcal} kcal | P ${m.proteina_g} · C ${m.carbohidratos_g} · G ${m.grasa_g} | $${r.precio_por_porcion_cop ?? "?"}`);
  }
  console.log(`\n${recipes.length} recetas en ${groups.size} grupos`);
  console.log(errors.length ? `\nERRORES:\n- ${errors.join("\n- ")}` : "Sin errores de validación");
  if (dry) return;
  if (errors.length) process.exit(1);

  const prisma = new PrismaClient();
  try {
    const g = data.metas_diarias;
    if (g) {
      const goals = { kcal: g.kcal, proteinG: g.proteina_g_objetivo, carbsG: g.carbohidratos_g, fatG: g.grasa_g };
      const goal = await prisma.nutritionGoal.findFirst({ orderBy: { id: "asc" } });
      if (goal) await prisma.nutritionGoal.update({ where: { id: goal.id }, data: { ...goals, updatedAt: new Date() } });
      else await prisma.nutritionGoal.create({ data: goals });
      console.log("✓ Metas guardadas");
    }

    let created = 0;
    for (const r of recipes) {
      if (await prisma.nutritionRecipe.findFirst({ where: { name: r.nombre } })) continue;
      const m = r.macros_por_porcion;
      await prisma.nutritionRecipe.create({
        data: {
          name: r.nombre,
          mealType: MEAL[r.comida],
          groupName: groups.get(r.grupo),
          servings: r.porciones_que_rinde ?? 1,
          prepMinutes: r.tiempo_total_min ?? null,
          steps: (r.pasos ?? []).map((p) => ({ text: p.texto, minutes: p.minutos ?? null })),
          storage: r.guardado ?? null,
          fridgeDays: r.dias_en_nevera ?? null,
          tips: [...(r.consejos ?? []), ...(r.notas ?? [])],
          costCop: r.precio_por_porcion_cop ?? null,
          kcal: m.kcal,
          proteinG: m.proteina_g,
          carbsG: m.carbohidratos_g,
          fatG: m.grasa_g,
          items: {
            create: r.ingredientes.flatMap((i) => {
              const grams = gramsOf(i);
              if (!grams) return [];
              return [
                {
                  foodName: i.ingrediente,
                  amountG: grams,
                  state: i.peso_cocido_g ? "cooked" : "unknown",
                  // Los macros viven en la receta (por porción), no por ingrediente.
                  kcal: 0,
                  proteinG: 0,
                  carbsG: 0,
                  fatG: 0,
                  isEstimated: true,
                  quantity: i.cantidad,
                  unit: i.unidad,
                  costCop: i.costo_estimado_cop ?? null,
                  store: i.tienda ?? null,
                },
              ];
            }),
          },
        },
      });
      created += 1;
    }
    console.log(`✓ Recetas: ${created} nuevas, ${recipes.length - created} ya existían`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
