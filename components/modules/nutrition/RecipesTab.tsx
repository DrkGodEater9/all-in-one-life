"use client";

import * as React from "react";
import { BookOpen, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
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
  SectionHeader,
  Skeleton,
  toast,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { RecipeDialog } from "./RecipeDialog";
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

export function RecipesTab({
  date,
  onLogged,
}: {
  date: string;
  /** Refresca el día en la pestaña "Hoy" tras registrar una receta. */
  onLogged: () => void;
}) {
  const [recipes, setRecipes] = React.useState<Recipe[] | null>(null);
  const [editing, setEditing] = React.useState<Recipe | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [logging, setLogging] = React.useState<Recipe | null>(null);

  const load = React.useCallback(async () => {
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
    void load();
  }, [load]);

  async function remove(recipe: Recipe) {
    if (!window.confirm(`¿Eliminar la receta "${recipe.name}"? Lo ya registrado no cambia.`)) return;
    try {
      await api.delete(`/nutrition/recipes/${recipe.id}`);
      toast({ title: "Receta eliminada" });
      void load();
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus />
          Nueva receta
        </Button>
      </div>

      {recipes === null ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Aún no tienes recetas"
          description="Guarda tus comidas habituales con sus cantidades y regístralas con un toque."
        />
      ) : (
        recipes.map((recipe) => (
          <Card key={recipe.id} className="p-4">
            <SectionHeader
              title={recipe.name}
              description={`${recipe.items.length} ${recipe.items.length === 1 ? "ingrediente" : "ingredientes"}${
                recipe.mealType ? ` · ${MEAL_LABELS[recipe.mealType]}` : ""
              }`}
              action={
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${recipe.name}`}
                    onClick={() => setEditing(recipe)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Eliminar ${recipe.name}`}
                    onClick={() => void remove(recipe)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              }
            />

            <p className="mt-3 font-mono text-xs text-text-3">
              <span className="text-sm text-text">{formatNumber(recipe.totals.kcal)} kcal</span>
              {" · "}P {formatNumber(recipe.totals.proteinG)} · C {formatNumber(recipe.totals.carbsG)} · G{" "}
              {formatNumber(recipe.totals.fatG)}
            </p>

            <ul className="mt-2 text-xs text-text-2">
              {recipe.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{item.foodName}</span>
                    {item.isEstimated ? (
                      <Badge variant="neutral" className="shrink-0">
                        estimado
                      </Badge>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-text-3">
                    {formatNumber(item.amountG)} g
                  </span>
                </li>
              ))}
            </ul>

            <Button className="mt-3 w-full" variant="secondary" onClick={() => setLogging(recipe)}>
              <Check />
              Hoy comí esto
            </Button>
          </Card>
        ))
      )}

      <RecipeDialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        recipe={editing}
        onSaved={() => void load()}
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
