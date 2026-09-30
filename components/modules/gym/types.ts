// Tipos y formateadores compartidos del módulo Gym (espejo de los DTO de /api/gym).

export type ExerciseType = "weight" | "bodyweight" | "cardio";

export const EXERCISE_TYPES: ExerciseType[] = ["weight", "bodyweight", "cardio"];

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  weight: "Peso",
  bodyweight: "Peso corporal",
  cardio: "Cardio",
};

export type RoutineExercise = {
  id: number;
  name: string;
  type: ExerciseType;
  orderIndex: number;
};

export type Routine = {
  id: number;
  name: string;
  exerciseCount: number;
  workoutCount: number;
  exercises: RoutineExercise[];
};

export type WorkoutSet = {
  id: number;
  exerciseName: string;
  exerciseType: ExerciseType;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSecs: number | null;
  distanceKm: number | null;
  notes: string | null;
  volume: number;
};

export type WorkoutDetail = {
  id: number;
  routineId: number;
  routineName: string;
  date: string;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSecs: number | null;
  totalVolume: number;
  exercises: RoutineExercise[];
  sets: WorkoutSet[];
};

export type WorkoutSummary = {
  id: number;
  routineId: number;
  routineName: string;
  date: string;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSecs: number | null;
  totalVolume: number;
  setCount: number;
  exerciseCount: number;
};

export type ExerciseOption = { name: string; type: ExerciseType; logged: boolean };

export type ExerciseSession = {
  workoutId: number;
  date: string;
  routineName: string;
  setCount: number;
  maxWeightKg: number | null;
  totalVolume: number;
  totalReps: number;
  totalDurationSecs: number;
  totalDistanceKm: number;
};

export type PersonalRecord = { value: number; date: string; workoutId: number } | null;

export type ExerciseRecords = {
  exerciseName: string;
  sessionCount: number;
  setCount: number;
  bestWeight: PersonalRecord;
  bestVolume: PersonalRecord;
  bestReps: PersonalRecord;
};

export type Measurement = {
  id: number;
  date: string;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armsCm: number | null;
  thighsCm: number | null;
  notes: string | null;
};

export type MeasurementKey = "chestCm" | "waistCm" | "hipsCm" | "armsCm" | "thighsCm";

export const MEASUREMENT_FIELDS: { key: MeasurementKey; label: string }[] = [
  { key: "chestCm", label: "Pecho" },
  { key: "waistCm", label: "Cintura" },
  { key: "hipsCm", label: "Cadera" },
  { key: "armsCm", label: "Brazos" },
  { key: "thighsCm", label: "Muslos" },
];

export type Streak = {
  month: string;
  daysInMonth: number;
  daysTrained: number;
  workoutCount: number;
  days: number[];
};

// ─────────────────────────────────────────
// Formato
// ─────────────────────────────────────────

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** 'YYYY-MM-DD' -> '4 oct 2026' */
export function formatDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return key;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** 'YYYY-MM-DD' -> '4 oct' */
export function formatDateShort(key: string) {
  const [, month, day] = key.split("-").map(Number);
  if (!month || !day) return key;
  return `${day} ${MONTHS[month - 1]}`;
}

/** Segundos -> '12:04' o '1:12:04'. Para el cronómetro. */
export function formatClock(totalSeconds: number) {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Segundos -> '1h 12m' / '48 min' / '—'. Para listados. */
export function formatDuration(totalSeconds: number | null | undefined) {
  if (totalSeconds === null || totalSeconds === undefined) return "—";
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** Número con separador de miles y decimales opcionales. */
export function formatAmount(value: number, decimals = 0) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Peso en kg sin decimales innecesarios: 62.5 -> '62,5' */
export function formatKg(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return formatAmount(value, Number.isInteger(value) ? 0 : 1);
}

/** 'YYYY-MM-DD' de hoy en hora local. */
export function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
