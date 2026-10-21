"use client";

import * as React from "react";
import { BookOpen, Check, Clock, Loader2, Plus, Search } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Skeleton,
  toast,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { RecipeDialog } from "./RecipeDialog";
import { MacroLine, RecipeDetailDialog, formatCop } from "./RecipeDetailDialog";
import { sanitizeDecimal } from "./numeric";
import { MEAL_LABELS, MEAL_TYPES, type MealType, type Recipe } from "./types";

/** Comida sugerida según la hora, para no tener que elegirla cada vez. */
function guessMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

function LogRecipeDialog({
  recipe,
  date,
  onClose,
  onLogged,
}: {
  recipe: Recipe;
  date: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [mealType, setMealType] = React.useState<MealType>(
    recipe.mealType ?? guessMealType()
  );
  const [servings, setServings] = React.useState("1");
  const [saving, setSaving] = React.useState(false);

  const k = Number(servings.replace(",", "."));
  const valid = Number.isFinite(k) && k > 0 && k <= 20;
  const kcal = valid ? Math.round(recipe.totals.kcal * k) : 0;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      await api.post(`/nutrition/recipes/${recipe.id}/log`, {
        date,
        mealType,
        servings: k,
      });
      toast({
        title: "Comida registrada",
        description: `${recipe.name} · ${formatNumber(kcal)} kcal`,
      });
      onLogged();
      onClose();
    } catch (error) {
      toast({
        title: "No se pudo registrar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hoy comí: {recipe.name}</DialogTitle>
          <DialogDescription>
            Se añaden todos sus ingredientes al registro de hoy.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label>Comida</Label>
            <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-surface p-1">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={mealType === t}
                  onClick={() => setMealType(t)}
                  className={
                    "rounded-sm px-1 py-1.5 text-xs font-medium transition-colors " +
                    (mealType === t
                      ? "bg-surface-2 text-text"
                      : "text-text-2 hover:text-text")
                  }
                >
                  {MEAL_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="servings">Porciones</Label>
            <Input
              id="servings"
              inputMode="decimal"
              autoComplete="off"
              className="font-mono"
              value={servings}
              onChange={(e) => setServings(sanitizeDecimal(e.target.value, 2, 2))}
            />
            <p className="text-xs text-text-3">
              1 = receta completa · 0.5 = la mitad · 2 = doble
            </p>
          </div>

          <div className="rounded-md border border-border p-3 text-center">
            <p className="font-mono text-lg text-text">{formatNumber(kcal)} kcal</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" onClick={() => void submit()} disabled={saving || !valid}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const NO_GROUP = "Sin grupo";

export function RecipesTab({
  date,
  recipes,
  onReload,
  onLogged,
  plan,
  onTogglePlan,
}: {
  date: string;
  /** null mientras carga. */
  recipes: Recipe[] | null;
  onReload: () => void;
  /** Refresca el día en la pestaña "Hoy" tras registrar una receta. */
  onLogged: () => void;
  /** Ids de recetas añadidas a la lista de compras. */
  plan: number[];
  onTogglePlan: (id: number) => void;
}) {
  const [editing, setEditing] = React.useState<Recipe | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [logging, setLogging] = React.useState<Recipe | null>(null);
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [filter, setFilter] = React.useState<MealType | "all">("all");
  const [query, setQuery] = React.useState("");

  const opened = recipes?.find((r) => r.id === openId) ?? null;

  // Comida -> grupos, en el orden del recetario (las recetas se importan en orden, así que el id lo conserva).
  const sections = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const byMeal = new Map<string, Map<string, Recipe[]>>();
    const sorted = [...(recipes ?? [])].sort((x, y) => x.id - y.id);
    for (const r of sorted) {
      if (filter !== "all" && r.mealType !== filter) continue;
      if (q && !r.name.toLowerCase().includes(q) && !r.items.some((i) => i.foodName.toLowerCase().includes(q))) continue;
      const meal = r.mealType ?? "none";
      const groups = byMeal.get(meal) ?? new Map<string, Recipe[]>();
      const key = r.groupName ?? NO_GROUP;
      groups.set(key, [...(groups.get(key) ?? []), r]);
      byMeal.set(meal, groups);
    }
    const order = [...MEAL_TYPES, "none"] as string[];
    return [...byMeal.entries()]
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
      .map(([meal, groups]) => ({ meal, groups: [...groups.entries()] }));
  }, [recipes, filter, query]);

  async function remove(recipe: Recipe) {
    if (!window.confirm(`¿Eliminar la receta "${recipe.name}"? Lo ya registrado no cambia.`)) return;
    try {
      await api.delete(`/nutrition/recipes/${recipe.id}`);
      toast({ title: "Receta eliminada" });
      setOpenId(null);
      onReload();
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[10rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar receta o ingrediente"
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          Nueva receta
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(["all", ...MEAL_TYPES] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={filter === t}
            onClick={() => setFilter(t)}
            className={
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (filter === t
                ? "border-accent bg-surface-2 text-text"
                : "border-border text-text-2 hover:text-text")
            }
          >
            {t === "all" ? "Todas" : MEAL_LABELS[t]}
          </button>
        ))}
      </div>

      {recipes === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : sections.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={recipes.length === 0 ? "Aún no tienes recetas" : "Nada coincide con el filtro"}
          description="Guarda tus recetas con ingredientes, pasos y costo; abre una para registrarla con un toque."
        />
      ) : (
        sections.map(({ meal, groups }) => (
          <div key={meal} className="space-y-4">
            <h2 className="border-b border-border pb-1 text-base font-semibold text-text">
              {meal === "none" ? "Sin comida" : MEAL_LABELS[meal as MealType]}
            </h2>
            {groups.map(([group, list], gi) => (
              <section key={group} className="space-y-2">
                <h3 className="flex items-baseline gap-2 text-sm font-medium text-text-2">
                  <span className="font-mono text-xs text-text-3">Grupo {gi + 1}</span>
                  {group}
                  <span className="font-mono text-xs font-normal text-text-3">{list.length}</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => setOpenId(recipe.id)}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="line-clamp-2 text-sm font-medium text-text">{recipe.name}</span>
                      <MacroLine recipe={recipe} />
                      <span className="mt-auto flex items-center gap-3 text-xs text-text-3">
                        {recipe.prepMinutes != null ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {recipe.prepMinutes} min
                          </span>
                        ) : null}
                        {recipe.costCop != null ? <span>{formatCop(recipe.costCop)}</span> : null}
                        <span>{recipe.items.length} ingr.</span>
                        {plan.includes(recipe.id) ? <span className="ml-auto text-accent">en compras</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ))
      )}

      {opened ? (
        <RecipeDetailDialog
          recipe={opened}
          inPlan={plan.includes(opened.id)}
          onClose={() => setOpenId(null)}
          onLog={() => {
            setLogging(opened);
            setOpenId(null);
          }}
          onEdit={() => {
            setEditing(opened);
            setOpenId(null);
          }}
          onDelete={() => void remove(opened)}
          onTogglePlan={() => onTogglePlan(opened.id)}
        />
      ) : null}

      <RecipeDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        recipe={editing}
        onSaved={onReload}
      />

      {logging ? (
        <LogRecipeDialog
          recipe={logging}
          date={date}
          onClose={() => setLogging(null)}
          onLogged={onLogged}
        />
      ) : null}
    </div>
  );
}
