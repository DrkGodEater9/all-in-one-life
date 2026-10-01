-- Habilita Row Level Security en todas las tablas de la app, sin políticas.
--
-- Por qué: Supabase expone automáticamente cada tabla de `public` por su API
-- PostgREST usando el anon key, que por diseño es una clave "pública"
-- (se asume que puede acabar en el bundle del navegador o filtrarse). Sin RLS,
-- cualquiera con esa clave lee y escribe TODA la base saltándose por completo
-- las rutas /api/* de Next.js (withAuth, Zod, las reglas de negocio de
-- balances/pagos/etc.) — es un camino de acceso totalmente independiente del
-- que usa esta app.
--
-- Por qué "sin políticas" no rompe nada: Prisma se conecta con el rol
-- `postgres.<ref>` (el dueño de las tablas). Postgres exime al dueño de las
-- políticas de RLS salvo que se use FORCE ROW LEVEL SECURITY (que NO se usa
-- aquí a propósito). O sea: Prisma sigue leyendo/escribiendo con normalidad;
-- lo único que cambia es que los roles `anon` y `authenticated` de PostgREST
-- —que es como Supabase expone las tablas por HTTP— quedan bloqueados por
-- completo, que es exactamente lo que se quiere: esta app nunca debe
-- exponerse por PostgREST, solo por sus propias API routes.
--
-- Corre una sola vez por entorno (dev/staging/prod), y de nuevo cada vez que
-- `prisma db push`/`migrate` agregue una tabla nueva al schema.

ALTER TABLE "RecurrenceRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceDebt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceDebtPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceCreditLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceCreditMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Streak" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StreakCheckin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutritionFoodCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutritionFavorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutritionMealLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutritionMealItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutritionGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutritionWeightLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutritionWaterLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymRoutine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymRoutineExercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymWorkout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymWorkoutSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymMeasurement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarReminder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskLabel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskLabelAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectTagAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectLink" ENABLE ROW LEVEL SECURITY;
