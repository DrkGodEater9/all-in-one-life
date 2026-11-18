import { z, call, qs, today, DATE, ID } from "../lib.mjs";

const MEAL = z.enum(["breakfast", "lunch", "dinner", "snack"]).describe("breakfast, lunch, dinner o snack");
const STATE = z.enum(["raw", "cooked", "unknown"]).describe("Estado del alimento al pesarlo");
const PER100 = z.number().min(0).max(10000);

export function register(tool) {
  tool(
    "nutrition_summary",
    "Nutrición: resumen del día (calorías y macros consumidos vs. metas). Por defecto hoy.",
    { date: DATE.optional() },
    ({ date }) => call("GET", `/nutrition/summary${qs({ date: date ?? today() })}`)
  );

  tool(
    "nutrition_log",
    "Nutrición: todo lo que se comió en un día, por comida. Por defecto hoy.",
    { date: DATE.optional() },
    ({ date }) => call("GET", `/nutrition/log${qs({ date: date ?? today() })}`)
  );

  tool(
    "log_food",
    "Nutrición: registra un alimento comido. Indica favoriteId (de list_favorites), foodCacheId (de search_food) o bien foodName + los valores por 100 g. amountG son gramos o ml. Fecha por defecto: hoy.",
    {
      mealType: MEAL,
      amountG: z.number().positive().max(10000),
      favoriteId: ID.optional(),
      foodCacheId: ID.optional(),
      foodName: z.string().optional(),
      kcal100g: PER100.optional(),
      protein100g: PER100.optional(),
      carbs100g: PER100.optional(),
      fat100g: PER100.optional(),
      state: STATE.optional(),
      date: DATE.optional(),
    },
    async ({ mealType, date, ...item }) => {
      const meal = await call("POST", "/nutrition/log/meal", { mealType, date: date ?? today() });
      return call("POST", `/nutrition/log/meal/${meal.id}/item`, item);
    }
  );

  tool(
    "delete_log_item",
    "Nutrición: elimina un alimento registrado (id del item en nutrition_log).",
    { id: ID },
    ({ id }) => call("DELETE", `/nutrition/log/item/${id}`)
  );

  tool(
    "log_recipe",
    "Nutrición: registra que comiste una receta (copia sus ingredientes a la comida del día). servings: 1 = completa, 0.5 = la mitad.",
    { recipeId: ID, mealType: MEAL, servings: z.number().positive().max(20).optional(), date: DATE.optional() },
    ({ recipeId, date, ...rest }) =>
      call("POST", `/nutrition/recipes/${recipeId}/log`, { ...rest, date: date ?? today() })
  );

  tool("list_recipes", "Nutrición: lista las recetas guardadas (con macros, costo y pasos).", {}, () =>
    call("GET", "/nutrition/recipes")
  );

  tool(
    "create_recipe",
    "Nutrición: guarda una receta. Cada ingrediente lleva foodName, amountG y los valores por 100 g (o favoriteId/foodCacheId).",
    {
      name: z.string(),
      mealType: MEAL.nullable().optional(),
      groupName: z.string().optional().describe("Grupo del recetario; las del mismo grupo son intercambiables"),
      description: z.string().optional(),
      servings: z.number().int().min(1).max(50).optional(),
      prepMinutes: z.number().int().min(0).max(600).optional(),
      steps: z.array(z.object({ text: z.string(), minutes: z.number().int().min(0).optional() })).optional(),
      storage: z.string().optional(),
      fridgeDays: z.number().int().min(0).max(30).optional(),
      tips: z.array(z.string()).optional(),
      items: z
        .array(
          z.object({
            foodName: z.string().optional(),
            favoriteId: ID.optional(),
            foodCacheId: ID.optional(),
            amountG: z.number().positive().max(10000),
            kcal100g: PER100.optional(),
            protein100g: PER100.optional(),
            carbs100g: PER100.optional(),
            fat100g: PER100.optional(),
            state: STATE.optional(),
            quantity: z.number().positive().optional(),
            unit: z.string().optional(),
            costCop: z.number().int().min(0).optional(),
            store: z.string().optional(),
          })
        )
        .min(1),
    },
    (args) => call("POST", "/nutrition/recipes", args)
  );

  tool(
    "delete_recipe",
    "Nutrición: elimina una receta (lo ya registrado no cambia). Irreversible: confírmalo antes.",
    { id: ID },
    ({ id }) => call("DELETE", `/nutrition/recipes/${id}`)
  );

  tool(
    "search_food",
    "Nutrición: busca un alimento en el catálogo (OpenFoodFacts + favoritos). Devuelve ids y valores por 100 g.",
    { q: z.string().min(2).describe("Al menos 2 caracteres") },
    ({ q }) => call("GET", `/nutrition/search${qs({ q })}`)
  );

  tool("list_favorites", "Nutrición: lista los alimentos favoritos.", {}, () => call("GET", "/nutrition/favorites"));

  tool(
    "add_favorite",
    "Nutrición: guarda un alimento favorito con sus valores por 100 g.",
    {
      name: z.string(),
      kcal100g: PER100,
      protein100g: PER100,
      carbs100g: PER100,
      fat100g: PER100,
      defaultUnit: z.enum(["g", "ml", "unit"]).optional(),
      kcalPerUnit: PER100.optional().describe("Calorías por unidad si defaultUnit es unit"),
    },
    (args) => call("POST", "/nutrition/favorites", args)
  );

  tool("delete_favorite", "Nutrición: elimina un favorito.", { id: ID }, ({ id }) =>
    call("DELETE", `/nutrition/favorites/${id}`)
  );

  tool(
    "get_water",
    "Nutrición: agua tomada en un día. Por defecto hoy.",
    { date: DATE.optional() },
    ({ date }) => call("GET", `/nutrition/water${qs({ date: date ?? today() })}`)
  );

  tool(
    "add_water",
    "Nutrición: suma agua al día (por defecto 250 ml, hoy).",
    { amountMl: z.number().int().min(1).max(5000).optional(), date: DATE.optional() },
    ({ date, ...rest }) => call("POST", "/nutrition/water", { ...rest, date: date ?? today() })
  );

  tool(
    "list_weight",
    "Nutrición: historial de peso corporal (kg). days = cuántos días atrás.",
    { days: z.number().int().min(1).max(3650).optional() },
    ({ days }) => call("GET", `/nutrition/weight${qs({ days })}`)
  );

  tool(
    "add_weight",
    "Nutrición: registra el peso corporal en kg. Fecha por defecto: hoy.",
    { weightKg: z.number().positive().max(500), date: DATE.optional(), notes: z.string().optional() },
    ({ date, ...rest }) => call("POST", "/nutrition/weight", { ...rest, date: date ?? today() })
  );

  tool("get_nutrition_goals", "Nutrición: metas diarias de calorías y macros.", {}, () =>
    call("GET", "/nutrition/goals")
  );

  tool(
    "set_nutrition_goals",
    "Nutrición: define las metas diarias (envía las cuatro).",
    {
      kcal: z.number().int().min(500).max(10000),
      proteinG: z.number().int().min(0).max(1000),
      carbsG: z.number().int().min(0).max(2000),
      fatG: z.number().int().min(0).max(500),
    },
    (args) => call("PUT", "/nutrition/goals", args)
  );

  tool(
    "nutrition_history",
    "Nutrición: calorías y macros por día en los últimos N días (por defecto 30).",
    { days: z.number().int().min(1).max(365).optional() },
    ({ days }) => call("GET", `/nutrition/history${qs({ days })}`)
  );

  tool("nutrition_streak", "Nutrición: racha de días registrando comidas.", {}, () =>
    call("GET", "/nutrition/streak")
  );

  tool("list_products", "Nutrición: lista de compras del recetario con precios (D1 y tienda de barrio).", {}, () =>
    call("GET", "/nutrition/products")
  );
}
