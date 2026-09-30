"use client";

import * as React from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  SectionHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Stat,
  toast,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/api";
import { axisProps, lineProps, tooltipProps } from "@/components/modules/gym/chart-theme";
import {
  formatAmount,
  formatDate,
  formatDateShort,
  formatKg,
  type ExerciseOption,
  type ExerciseRecords,
  type ExerciseSession,
  type Streak,
} from "@/components/modules/gym/types";

export function ProgressTab() {
  const [exercises, setExercises] = React.useState<ExerciseOption[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [sessions, setSessions] = React.useState<ExerciseSession[]>([]);
  const [records, setRecords] = React.useState<ExerciseRecords | null>(null);
  const [streak, setStreak] = React.useState<Streak | null>(null);
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingExercise, setLoadingExercise] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [options, streakData] = await Promise.all([
          api.get<ExerciseOption[]>("/gym/exercises"),
          // Mes local del cliente explícito, no el default del servidor
          // (mismo motivo que nutrition/streak: evita el corrimiento de un
          // día cerca de fin de mes en husos negativos como Bogotá).
          api.get<Streak>(
            `/gym/streak?month=${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
          ),
        ]);
        if (!active) return;
        setExercises(options);
        setStreak(streakData);
        const first = options.find((option) => option.logged) ?? options[0];
        if (first) setSelected(first.name);
      } catch (error) {
        if (active) {
          toast({
            variant: "destructive",
            title: "No se pudo cargar el progreso",
            description:
              error instanceof ApiClientError ? error.message : "Intenta de nuevo",
          });
        }
      } finally {
        if (active) setLoadingList(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoadingExercise(true);
    (async () => {
      const encoded = encodeURIComponent(selected);
      try {
        const [history, record] = await Promise.all([
          api.get<ExerciseSession[]>(`/gym/exercise/${encoded}/history`),
          api.get<ExerciseRecords>(`/gym/exercise/${encoded}/record`),
        ]);
        if (!active) return;
        setSessions(history);
        setRecords(record);
      } catch (error) {
        if (active) {
          toast({
            variant: "destructive",
            title: "No se pudo cargar el ejercicio",
            description:
              error instanceof ApiClientError ? error.message : "Intenta de nuevo",
          });
        }
      } finally {
        if (active) setLoadingExercise(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selected]);

  const chartData = React.useMemo(
    () =>
      sessions
        .filter((session) => session.maxWeightKg !== null)
        .map((session) => ({
          label: formatDateShort(session.date),
          peso: session.maxWeightKg ?? 0,
          volumen: session.totalVolume,
        })),
    [sessions]
  );

  const streakPct =
    streak && streak.daysInMonth > 0
      ? Math.round((streak.daysTrained / streak.daysInMonth) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Progreso"
        description="Evolución por ejercicio y racha del mes."
        action={
          exercises.length ? (
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-[190px]" aria-label="Ejercicio">
                <SelectValue placeholder="Ejercicio" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.name} value={exercise.name}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Racha del mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {streak ? (
            <>
              <Stat
                label="días entrenados este mes"
                value={
                  <span className="font-mono tabular-nums">
                    {streak.daysTrained}
                    <span className="text-text-3">/{streak.daysInMonth}</span>
                  </span>
                }
              />
              <Progress value={streakPct} />
            </>
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
        </CardContent>
      </Card>

      {loadingList ? (
        <Skeleton className="h-64 w-full" />
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Sin datos de progreso"
          description="Crea una rutina y registra un entreno para ver tu evolución."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Peso máximo por sesión</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExercise ? (
                <Skeleton className="h-56 w-full" />
              ) : chartData.length === 0 ? (
                <EmptyState
                  icon={LineChartIcon}
                  title="Sin series con peso registradas"
                  description="Registra series de este ejercicio para ver la gráfica."
                />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                    >
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis width={44} unit=" kg" {...axisProps} />
                      <Tooltip {...tooltipProps} />
                      <Line type="monotone" dataKey="peso" name="Peso máx." {...lineProps} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Records personales</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExercise || !records ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Stat
                    label="Mejor peso"
                    valueClassName="font-mono tabular-nums"
                    value={
                      records.bestWeight ? `${formatKg(records.bestWeight.value)} kg` : "—"
                    }
                    sub={
                      records.bestWeight ? formatDate(records.bestWeight.date) : "Sin registro"
                    }
                  />
                  <Stat
                    label="Mejor volumen"
                    valueClassName="font-mono tabular-nums"
                    value={
                      records.bestVolume
                        ? `${formatAmount(records.bestVolume.value)} kg`
                        : "—"
                    }
                    sub={
                      records.bestVolume ? formatDate(records.bestVolume.date) : "Sin registro"
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
