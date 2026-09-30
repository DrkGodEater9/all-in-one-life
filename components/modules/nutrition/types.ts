/** Tipos de las respuestas de /api/nutrition, tal y como llegan al cliente. */

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snacks",
};

export type FoodState = "raw" | "cooked" | "unknown";

export const STATE_LABELS: Record<FoodState, string> = {
  raw: "Crudo",
  cooked: "Cocido",
  unknown: "Sin especificar",
};

export type Macros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type MealItem = {
  id: number;
  mealLogId: number;
  foodName: string;
  foodCacheId: number | null;
  favoriteId: number | null;
  amountG: number;
  state: FoodState;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isEstimated: boolean;
};

export type MealLog = {
  id: number;
  date: string;
  mealType: MealType;
  items: MealItem[];
  totals: Macros;
};

export type DayLog = {
  date: string;
  meals: MealLog[];
};

export type Goal = {
  id: number | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  updatedAt: string | null;
};

export type Summary = {
  date: string;
  totals: Macros;
  goal: Goal;
  remaining: Macros;
  itemCount: number;
};

export type Streak = {
  streak: number;
  loggedToday: boolean;
  lastLoggedDate: string | null;
};

export type FoodResult = {
  key: string;
  source: "favorite" | "cache" | "off";
  foodCacheId: number | null;
  favoriteId: number | null;
  offId: string | null;
  name: string;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
};

export type Favorite = {
  id: number;
  name: string;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  defaultUnit: string;
  kcalPerUnit: number | null;
  createdAt: string;
};

export type WeightLog = {
  id: number;
  date: string;
  weightKg: number;
  notes: string | null;
};

export type WaterDay = {
  date: string;
  totalMl: number;
  goalMl: number;
  logs: Array<{ id: number; amountMl: number; createdAt: string }>;
};

/** Colores del spec para los macros: proteína verde, carbs amarillo, grasa azul. */
export const MACRO_BAR = {
  protein: { label: "Proteína", bar: "bg-green", text: "text-green" },
  carbs: { label: "Carbos", bar: "bg-yellow", text: "text-yellow" },
  fat: { label: "Grasa", bar: "bg-accent", text: "text-accent" },
} as const;
