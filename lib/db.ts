import { PrismaClient } from "@prisma/client";
import { currentUserId, runAsUser } from "@/lib/user-context";

/**
 * Multiusuario: cada fila pertenece a un usuario de Supabase (`userId`).
 *
 * `prisma` (el export de siempre) es un cliente extendido que, en TODA
 * operación, restringe lo que lee/modifica/borra al usuario de la petición y
 * le estampa su `userId` a lo que crea. El usuario sale de un
 * AsyncLocalStorage que `withAuth` llena con la sesión; así ninguna ruta tiene
 * que acordarse de filtrar (y ninguna puede olvidarse). Sin usuario en
 * contexto la operación FALLA en vez de devolver datos de todos.
 *
 * - Modelos "raíz": tienen columna `userId`.
 * - Modelos "hijo": no la tienen; se filtran por su padre (`source: { userId }`).
 *   Así los creados anidados (`items: { create }`) no necesitan estampa.
 * - `NutritionFoodCache` es caché compartida de OpenFoodFacts: sin dueño.
 *
 * `prismaAdmin` es el cliente sin filtro, para cron, seed y scripts. Úsalo
 * solo donde de verdad haga falta tocar datos de todos.
 */

const globalForPrisma = globalThis as unknown as {
  prismaAdmin: PrismaClient | undefined;
};

export const prismaAdmin =
  globalForPrisma.prismaAdmin ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaAdmin = prismaAdmin;

export { runAsUser };

/** Modelos con columna `userId`. */
const ROOT_MODELS = new Set([
  "RecurrenceRule",
  "FinanceSource",
  "FinanceAsset",
  "FinanceCreditLine",
  "Streak",
  "NutritionFavorite",
  "NutritionMealLog",
  "NutritionRecipe",
  "NutritionGoal",
  "NutritionWeightLog",
  "NutritionWaterLog",
  "NutritionProduct",
  "GymRoutine",
  "GymMeasurement",
  "CalendarEvent",
  "TaskLabel",
  "Task",
  "ProjectCategory",
  "Project",
  "ProjectTag",
  "BlogPost",
  "Concept",
]);

type Where = Record<string, unknown>;

/** Hijos: cómo llegar a la raíz dueña, como filtro anidado. */
const CHILD_SCOPE: Record<string, (userId: string) => Where> = {
  FinanceTransaction: (userId) => ({ source: { userId } }),
  FinanceDebt: (userId) => ({ source: { userId } }),
  FinanceDebtPayment: (userId) => ({ debt: { source: { userId } } }),
  FinanceCreditMovement: (userId) => ({ creditLine: { userId } }),
  StreakCheckin: (userId) => ({ streak: { userId } }),
  NutritionMealItem: (userId) => ({ mealLog: { userId } }),
  NutritionRecipeItem: (userId) => ({ recipe: { userId } }),
  GymRoutineExercise: (userId) => ({ routine: { userId } }),
  GymWorkout: (userId) => ({ routine: { userId } }),
  GymWorkoutSet: (userId) => ({ workout: { routine: { userId } } }),
  CalendarReminder: (userId) => ({ event: { userId } }),
  TaskLabelAssignment: (userId) => ({ task: { userId } }),
  ProjectTagAssignment: (userId) => ({ project: { userId } }),
  ProjectNote: (userId) => ({ project: { userId } }),
  ProjectLink: (userId) => ({ project: { userId } }),
  BlogLink: (userId) => ({ post: { userId } }),
};

/** Modelos compartidos a propósito (sin dueño). */
const SHARED_MODELS = new Set(["NutritionFoodCache"]);

function scopeFor(model: string, userId: string): Where | null {
  if (ROOT_MODELS.has(model)) return { userId };
  const child = CHILD_SCOPE[model];
  return child ? child(userId) : null;
}

/** El dueño de una fila no se puede cambiar por update: se descarta `userId`. */
function stripOwner(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const { userId: _ignored, ...rest } = data as Record<string, unknown>;
  return rest;
}

function withScope(where: unknown, scope: Where): Where {
  const base = (where ?? {}) as Where;
  const and = base.AND;
  const existing = Array.isArray(and) ? and : and ? [and] : [];
  return { ...base, AND: [...existing, scope] };
}

const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

export const prisma = prismaAdmin.$extends({
  name: "per-user-scope",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (SHARED_MODELS.has(model)) return query(args);

        const userId = currentUserId();
        if (!userId) {
          throw new Error(
            `Consulta a ${model}.${operation} sin usuario en contexto (usa withAuth, runAsUser o prismaAdmin)`
          );
        }

        const scope = scopeFor(model, userId);
        if (!scope) throw new Error(`El modelo ${model} no está registrado en lib/db.ts`);

        const a = (args ?? {}) as Record<string, unknown>;

        if (WHERE_OPS.has(operation)) a.where = withScope(a.where, scope);

        if (ROOT_MODELS.has(model)) {
          if (operation === "create") {
            a.data = { ...(a.data as object), userId };
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            const data = a.data as object | object[];
            a.data = Array.isArray(data)
              ? data.map((d) => ({ ...d, userId }))
              : { ...data, userId };
          } else if (operation === "upsert") {
            a.create = { ...(a.create as object), userId };
            a.update = stripOwner(a.update);
          } else if (operation === "update" || operation === "updateMany") {
            a.data = stripOwner(a.data);
          }
        }

        return query(a);
      },
    },
  },
});

export default prisma;

/** Cliente dentro de `prisma.$transaction(async (tx) => ...)`. */
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
