"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  toast,
} from "@/components/ui";
import type { Goal } from "@/components/modules/nutrition/types";
import { DEFAULT_WATER_GOAL_ML, usePreferences } from "./use-preferences";

// ─────────────────────────────────────────
// Metas nutricionales — GET/PUT /api/nutrition/goals (ya existe)
// ─────────────────────────────────────────

const goalsSchema = z.object({
  kcal: z.coerce.number().int().min(500, "Mínimo 500").max(10000, "Máximo 10000"),
  proteinG: z.coerce.number().int().min(0).max(1000, "Máximo 1000"),
  carbsG: z.coerce.number().int().min(0).max(2000, "Máximo 2000"),
  fatG: z.coerce.number().int().min(0).max(500, "Máximo 500"),
});
type GoalsValues = z.infer<typeof goalsSchema>;

function NutritionGoalsSection() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const form = useForm<GoalsValues>({
    resolver: zodResolver(goalsSchema),
    defaultValues: { kcal: 2000, proteinG: 150, carbsG: 200, fatG: 60 },
  });

  React.useEffect(() => {
    let cancelled = false;
    api
      .get<Goal>("/nutrition/goals")
      .then((goal) => {
        if (cancelled) return;
        form.reset({
          kcal: goal.kcal,
          proteinG: goal.proteinG,
          carbsG: goal.carbsG,
          fatG: goal.fatG,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "No se pudieron cargar las metas nutricionales",
          description: error instanceof ApiClientError ? error.message : undefined,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: GoalsValues) {
    setSaving(true);
    try {
      const goal = await api.put<Goal>("/nutrition/goals", values);
      form.reset({
        kcal: goal.kcal,
        proteinG: goal.proteinG,
        carbsG: goal.carbsG,
        fatG: goal.fatG,
      });
      toast({ title: "Metas nutricionales actualizadas" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudieron guardar las metas",
        description: error instanceof ApiClientError ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metas nutricionales</CardTitle>
        <CardDescription>
          Se usan en el resumen diario de Nutrición y en el widget de calorías del home.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="kcal">Calorías (kcal)</Label>
                <Input
                  id="kcal"
                  type="number"
                  inputMode="numeric"
                  className="font-mono"
                  {...form.register("kcal")}
                />
                {form.formState.errors.kcal ? (
                  <p className="text-xs text-danger">{form.formState.errors.kcal.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proteinG">Proteína (g)</Label>
                <Input
                  id="proteinG"
                  type="number"
                  inputMode="numeric"
                  className="font-mono"
                  {...form.register("proteinG")}
                />
                {form.formState.errors.proteinG ? (
                  <p className="text-xs text-danger">{form.formState.errors.proteinG.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="carbsG">Carbohidratos (g)</Label>
                <Input
                  id="carbsG"
                  type="number"
                  inputMode="numeric"
                  className="font-mono"
                  {...form.register("carbsG")}
                />
                {form.formState.errors.carbsG ? (
                  <p className="text-xs text-danger">{form.formState.errors.carbsG.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fatG">Grasa (g)</Label>
                <Input
                  id="fatG"
                  type="number"
                  inputMode="numeric"
                  className="font-mono"
                  {...form.register("fatG")}
                />
                {form.formState.errors.fatG ? (
                  <p className="text-xs text-danger">{form.formState.errors.fatG.message}</p>
                ) : null}
              </div>
            </div>
            <Button type="submit" disabled={saving || !form.formState.isDirty}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar metas
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// Zona horaria + objetivo de agua — localStorage (ver use-preferences.ts)
// ─────────────────────────────────────────

/** Lista de husos horarios soportados por el motor JS del navegador. */
function useTimezoneOptions() {
  return React.useMemo(() => {
    try {
      const supported = (
        Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
      ).supportedValuesOf?.("timeZone");
      if (supported && supported.length > 0) return supported;
    } catch {
      // Intl.supportedValuesOf no disponible en este motor: usar el fallback.
    }
    return [
      "America/Bogota",
      "America/Mexico_City",
      "America/Lima",
      "America/Santiago",
      "America/Buenos_Aires",
      "America/New_York",
      "America/Los_Angeles",
      "Europe/Madrid",
      "UTC",
    ];
  }, []);
}

const preferencesSchema = z.object({
  timezone: z.string().min(1, "Selecciona una zona horaria"),
  waterGoalMl: z.coerce.number().int().min(250, "Mínimo 250 ml").max(10000, "Máximo 10000 ml"),
});
type PreferencesValues = z.infer<typeof preferencesSchema>;

function PreferencesSection() {
  const { preferences, hydrated, update } = usePreferences();
  const timezones = useTimezoneOptions();

  const form = useForm<PreferencesValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: { timezone: preferences.timezone, waterGoalMl: preferences.waterGoalMl },
  });

  React.useEffect(() => {
    if (hydrated) {
      form.reset({ timezone: preferences.timezone, waterGoalMl: preferences.waterGoalMl });
    }
    // Solo al hidratar desde localStorage; los cambios del propio formulario
    // no deben forzar un reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function onSubmit(values: PreferencesValues) {
    update(values);
    form.reset(values);
    toast({ title: "Preferencias guardadas" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zona horaria y agua</CardTitle>
        <CardDescription>
          Se guardan en este navegador: el schema de fase 1 no tiene una tabla de
          configuración, así que no hay dónde persistirlas en la base de datos todavía.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Zona horaria</Label>
                <Select
                  value={form.watch("timezone")}
                  onValueChange={(value) => form.setValue("timezone", value, { shouldDirty: true })}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Selecciona una zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waterGoalMl">Objetivo de agua diario (ml)</Label>
                <Input
                  id="waterGoalMl"
                  type="number"
                  inputMode="numeric"
                  step={250}
                  className="font-mono"
                  {...form.register("waterGoalMl")}
                />
                {form.formState.errors.waterGoalMl ? (
                  <p className="text-xs text-danger">
                    {form.formState.errors.waterGoalMl.message}
                  </p>
                ) : (
                  <p className="text-xs text-text-3">Por defecto {DEFAULT_WATER_GOAL_ML} ml.</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={!form.formState.isDirty}>
              Guardar preferencias
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────
// Apariencia — next-themes
// ─────────────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isLight = theme === "light";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
        <CardDescription>Oscuro por defecto, como pide el sistema visual.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm text-text">Tema oscuro</p>
            <p className="text-xs text-text-2">
              {mounted ? (isLight ? "Tema claro activo" : "Tema oscuro activo") : "Cargando…"}
            </p>
          </div>
          <Switch
            checked={mounted ? !isLight : true}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            disabled={!mounted}
            aria-label="Alternar tema oscuro/claro"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsClient() {
  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <NutritionGoalsSection />
      <PreferencesSection />
      <AppearanceSection />
    </div>
  );
}
