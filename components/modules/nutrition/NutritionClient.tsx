"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { toDateKey } from "@/lib/utils";
import { NutritionHeader } from "./NutritionHeader";
import { TodayTab } from "./TodayTab";
// Gráfica de peso con recharts: fuera del bundle inicial de /nutrition.
const WeightTab = dynamic(() => import("./WeightTab").then((m) => m.WeightTab), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});
import { WaterTab } from "./WaterTab";
import { RecipesTab } from "./RecipesTab";
import { ShoppingTab, type PlanEntry } from "./ShoppingTab";
import type {
  DayLog,
  Recipe,
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

  const [recipes, setRecipes] = React.useState<Recipe[] | null>(null);
  // Lista de compras: se recuerda en este navegador.
  const [plan, setPlan] = React.useState<PlanEntry[]>([]);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("nutrition-shopping-plan");
      if (raw) setPlan(JSON.parse(raw) as PlanEntry[]);
    } catch {
      /* sin almacenamiento: la lista vive solo en memoria */
    }
  }, []);
  const updatePlan = React.useCallback((next: PlanEntry[]) => {
    setPlan(next);
    try {
      localStorage.setItem("nutrition-shopping-plan", JSON.stringify(next));
    } catch {
      /* ignorar */
    }
  }, []);
  const togglePlan = (id: number) =>
    updatePlan(plan.some((p) => p.id === id) ? plan.filter((p) => p.id !== id) : [...plan, { id, servings: 1 }]);

  const loadRecipes = React.useCallback(async () => {
    try {
      setRecipes(await api.get<Recipe[]>("/nutrition/recipes"));
    } catch (error) {
      setRecipes([]);
      toast({
        title: "No se pudieron cargar las recetas",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  }, []);
  React.useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  const [loadingDay, setLoadingDay] = React.useState(true);
  const [loadingWeight, setLoadingWeight] = React.useState(true);
  const [loadingWater, setLoadingWater] = React.useState(true);

  const loadDay = React.useCallback(async (key: string) => {
    setLoadingDay(true);
    try {
      const [s, l, st] = await Promise.all([
        api.get<Summary>(`/nutrition/summary${qs({ date: key })}`),
        api.get<DayLog>(`/nutrition/log${qs({ date: key })}`),
        api.get<Streak>(`/nutrition/streak${qs({ date: key })}`),
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

      <Tabs defaultValue="recipes">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="recipes">Recetas</TabsTrigger>
          <TabsTrigger value="shopping">
            Compras{plan.length > 0 ? ` (${plan.length})` : ""}
          </TabsTrigger>
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

        <TabsContent value="recipes">
          <RecipesTab
            date={date ?? ""}
            recipes={recipes}
            onReload={() => void loadRecipes()}
            onLogged={refreshDay}
            plan={plan.map((p) => p.id)}
            onTogglePlan={togglePlan}
          />
        </TabsContent>

        <TabsContent value="shopping">
          <ShoppingTab recipes={recipes} plan={plan} onChange={updatePlan} />
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
