"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { toDateKey } from "@/lib/utils";
import { NutritionHeader } from "./NutritionHeader";
import { TodayTab } from "./TodayTab";
import { WeightTab } from "./WeightTab";
import { WaterTab } from "./WaterTab";
import type {
  DayLog,
  Streak,
  Summary,
  WaterDay,
  WeightLog,
} from "./types";

export function NutritionClient() {
  // La fecha se fija en el cliente para respetar el huso del usuario.
  const [date, setDate] = React.useState<string | null>(null);
  React.useEffect(() => setDate(toDateKey()), []);

  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [streak, setStreak] = React.useState<Streak | null>(null);
  const [log, setLog] = React.useState<DayLog | null>(null);
  const [weights, setWeights] = React.useState<WeightLog[]>([]);
  const [water, setWater] = React.useState<WaterDay | null>(null);

  const [loadingDay, setLoadingDay] = React.useState(true);
  const [loadingWeight, setLoadingWeight] = React.useState(true);
  const [loadingWater, setLoadingWater] = React.useState(true);

  const loadDay = React.useCallback(async (key: string) => {
    setLoadingDay(true);
    try {
      const [s, l, st] = await Promise.all([
        api.get<Summary>(`/nutrition/summary${qs({ date: key })}`),
        api.get<DayLog>(`/nutrition/log${qs({ date: key })}`),
        api.get<Streak>("/nutrition/streak"),
      ]);
      setSummary(s);
      setLog(l);
      setStreak(st);
    } catch (error) {
      toast({
        title: "No se pudo cargar el día",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoadingDay(false);
    }
  }, []);

  const loadWeights = React.useCallback(async () => {
    setLoadingWeight(true);
    try {
      setWeights(await api.get<WeightLog[]>("/nutrition/weight"));
    } catch (error) {
      toast({
        title: "No se pudo cargar el peso",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoadingWeight(false);
    }
  }, []);

  const loadWater = React.useCallback(async (key: string) => {
    setLoadingWater(true);
    try {
      setWater(await api.get<WaterDay>(`/nutrition/water${qs({ date: key })}`));
    } catch (error) {
      toast({
        title: "No se pudo cargar el agua",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoadingWater(false);
    }
  }, []);

  React.useEffect(() => {
    if (!date) return;
    void loadDay(date);
    void loadWeights();
    void loadWater(date);
  }, [date, loadDay, loadWeights, loadWater]);

  const refreshDay = React.useCallback(() => {
    if (date) void loadDay(date);
  }, [date, loadDay]);

  const refreshWater = React.useCallback(() => {
    if (date) void loadWater(date);
  }, [date, loadWater]);

  return (
    <div className="space-y-5">
      <NutritionHeader
        summary={summary}
        streak={streak}
        loading={loadingDay || !date}
      />

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="weight">Peso</TabsTrigger>
          <TabsTrigger value="water">Agua</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <TodayTab
            date={date ?? ""}
            log={log}
            loading={loadingDay || !date}
            onChanged={refreshDay}
          />
        </TabsContent>

        <TabsContent value="weight">
          <WeightTab
            date={date ?? ""}
            logs={weights}
            loading={loadingWeight || !date}
            onChanged={loadWeights}
          />
        </TabsContent>

        <TabsContent value="water">
          <WaterTab
            date={date ?? ""}
            water={water}
            loading={loadingWater || !date}
            onChanged={refreshWater}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default NutritionClient;
