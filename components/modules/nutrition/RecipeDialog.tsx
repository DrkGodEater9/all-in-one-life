"use client";

import * as React from "react";
import { Loader2, Search, Star, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
  Textarea,
  toast,
} from "@/components/ui";
import { api, qs } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { sanitizeDecimal } from "./numeric";
import {
  MEAL_LABELS,
  MEAL_TYPES,
  type Favorite,
  type FoodResult,
  type MealType,
  type Recipe,
} from "./types";

type Row = {
  key: string;
  foodName: string;
  favoriteId: number | null;
  foodCacheId: number | null;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  /** Solo al editar: el ingrediente viene de una receta guardada. */
  estimated?: boolean;
  amount: string;
  /** Datos de compra que la edición conserva tal cual. */
  quantity?: number | null;
  unit?: string | null;
  costCop?: number | null;
  store?: string | null;
};

let rowSeq = 0;
const nextKey = () => `row-${(rowSeq += 1)}`;

function favoriteToFood(f: Favorite): FoodResult {
  return {
    key: `fav-${f.id}`,
    source: "favorite",
    foodCacheId: null,
    favoriteId: f.id,
    offId: null,
    name: f.name,
    kcal100g: f.kcal100g,
    protein100g: f.protein100g,
    carbs100g: f.carbs100g,
    fat100g: f.fat100g,
  };
}

function rowsFromRecipe(recipe: Recipe): Row[] {
  return recipe.items.map((i) => {
    const f = 100 / i.amountG;
    return {
      key: nextKey(),
      foodName: i.foodName,
      favoriteId: null,
      foodCacheId: null,
      kcal100g: i.kcal * f,
      protein100g: i.proteinG * f,
      carbs100g: i.carbsG * f,
      fat100g: i.fatG * f,
      estimated: i.isEstimated,
      amount: String(i.amountG),
      quantity: i.quantity,
      unit: i.unit,
      costCop: i.costCop,
      store: i.store,
    };
  });
}

function amountOf(row: Row) {
  const n = Number(row.amount.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function RecipeDialog({
  open,
  onOpenChange,
  recipe,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene, el diálogo edita esa receta; si no, crea una nueva. */
  recipe: Recipe | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [mealType, setMealType] = React.useState<MealType | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [groupName, setGroupName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [prepMinutes, setPrepMinutes] = React.useState("");
  const [stepsText, setStepsText] = React.useState("");
  const [storage, setStorage] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<FoodResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [favorites, setFavorites] = React.useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = React.useState(false);
  const requestId = React.useRef(0);

  React.useEffect(() => {
    if (!open) return;
    setName(recipe?.name ?? "");
    setMealType(recipe?.mealType ?? null);
    setRows(recipe ? rowsFromRecipe(recipe) : []);
    setGroupName(recipe?.groupName ?? "");
    setDescription(recipe?.description ?? "");
    setPrepMinutes(recipe?.prepMinutes != null ? String(recipe.prepMinutes) : "");
    setStepsText(recipe?.steps.map((s) => s.text).join("\n") ?? "");
    setStorage(recipe?.storage ?? "");
    setQuery("");
    setResults([]);
    setLoadingFavorites(true);
    api
      .get<Favorite[]>("/nutrition/favorites")
      .then(setFavorites)
      .catch(() =>
        toast({ title: "No se pudieron cargar los favoritos", variant: "destructive" })
      )
      .finally(() => setLoadingFavorites(false));
  }, [open, recipe]);

  // Debounce de 300 ms sobre la búsqueda.
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const id = ++requestId.current;
      try {
        const data = await api.get<FoodResult[]>(`/nutrition/search${qs({ q })}`);
        if (id === requestId.current) setResults(data);
      } catch {
        if (id === requestId.current) {
          setResults([]);
          toast({ title: "La búsqueda de alimentos falló", variant: "destructive" });
        }
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  const totals = React.useMemo(() => {
    if (recipe?.macrosDeclared) return recipe.totals;
    return rows.reduce(
      (acc, r) => {
        const f = amountOf(r) / 100;
        return {
          kcal: acc.kcal + r.kcal100g * f,
          proteinG: acc.proteinG + r.protein100g * f,
          carbsG: acc.carbsG + r.carbs100g * f,
          fatG: acc.fatG + r.fat100g * f,
        };
      },
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );
  }, [rows, recipe]);

  function addFood(food: FoodResult) {
    setRows((prev) => [
      ...prev,
      {
        key: nextKey(),
        foodName: food.name,
        favoriteId: food.favoriteId,
        foodCacheId: food.foodCacheId,
        kcal100g: food.kcal100g,
        protein100g: food.protein100g,
        carbs100g: food.carbs100g,
        fat100g: food.fat100g,
        amount: "100",
      },
    ]);
    setQuery("");
  }

  function setAmount(key: string, amount: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, amount } : r)));
  }

  async function save() {
    const cleanName = name.trim();
    if (!cleanName) {
      toast({ title: "Ponle un nombre a la receta", variant: "destructive" });
      return;
    }
    if (rows.length === 0) {
      toast({ title: "Añade al menos un ingrediente", variant: "destructive" });
      return;
    }
    if (rows.some((r) => amountOf(r) <= 0)) {
      toast({ title: "Revisa los gramos de cada ingrediente", variant: "destructive" });
      return;
    }

    const payload = {
      name: cleanName,
      mealType,
      groupName: groupName.trim() || null,
      description: description.trim() || null,
      prepMinutes: prepMinutes ? Math.round(Number(prepMinutes)) : null,
      storage: storage.trim() || null,
      // Lo que el formulario no edita se conserva tal cual al guardar.
      servings: recipe?.servings,
      fridgeDays: recipe?.fridgeDays ?? null,
      tips: recipe?.tips,
      macros: recipe?.macrosDeclared
        ? {
            kcal: recipe.totals.kcal,
            proteinG: recipe.totals.proteinG,
            carbsG: recipe.totals.carbsG,
            fatG: recipe.totals.fatG,
          }
        : null,
      steps: stepsText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({
          text,
          minutes: recipe?.steps.find((s) => s.text === text)?.minutes ?? null,
        })),
      items: rows.map((r) => ({
        quantity: r.quantity ?? null,
        unit: r.unit ?? null,
        costCop: r.costCop ?? null,
        store: r.store ?? null,
        foodName: r.foodName,
        // Los ingredientes con respaldo en catálogo los resuelve el servidor.
        favoriteId: r.favoriteId ?? undefined,
        foodCacheId: r.favoriteId === null ? (r.foodCacheId ?? undefined) : undefined,
        kcal100g: r.favoriteId === null && r.foodCacheId === null ? r.kcal100g : undefined,
        protein100g: r.favoriteId === null && r.foodCacheId === null ? r.protein100g : undefined,
        carbs100g: r.favoriteId === null && r.foodCacheId === null ? r.carbs100g : undefined,
        fat100g: r.favoriteId === null && r.foodCacheId === null ? r.fat100g : undefined,
        estimated: r.estimated,
        amountG: amountOf(r),
      })),
    };

    setSaving(true);
    try {
      if (recipe) await api.put(`/nutrition/recipes/${recipe.id}`, payload);
      else await api.post("/nutrition/recipes", payload);
      toast({ title: recipe ? "Receta actualizada" : "Receta guardada" });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo guardar la receta",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const showFavorites = query.trim().length < 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{recipe ? "Editar receta" : "Nueva receta"}</DialogTitle>
          <DialogDescription>
            Añade los ingredientes con sus gramos; las kcal y macros se calculan solas.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="recipe-name">Nombre</Label>
            <Input
              id="recipe-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bowl de pollo con arroz"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Comida habitual (opcional)</Label>
            <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-surface p-1">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={mealType === t}
                  onClick={() => setMealType(mealType === t ? null : t)}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="recipe-group">Grupo (opcional)</Label>
              <Input
                id="recipe-group"
                value={groupName}
                maxLength={80}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Desayunos con avena"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipe-prep">Tiempo (min)</Label>
              <Input
                id="recipe-prep"
                inputMode="numeric"
                className="font-mono"
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipe-desc">Descripción (opcional)</Label>
            <Input
              id="recipe-desc"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label>Ingredientes</Label>
            {rows.length > 0 ? (
              <ul className="rounded-md border border-border">
                {rows.map((r) => {
                  const f = amountOf(r) / 100;
                  return (
                    <li
                      key={r.key}
                      className="flex items-center gap-2 border-t border-border px-2.5 py-2 first:border-t-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text">{r.foodName}</p>
                        <p className="font-mono text-xs text-text-3">
                          {formatNumber(Math.round(r.kcal100g * f))} kcal · P{" "}
                          {formatNumber(Math.round(r.protein100g * f))} · C{" "}
                          {formatNumber(Math.round(r.carbs100g * f))} · G{" "}
                          {formatNumber(Math.round(r.fat100g * f))}
                        </p>
                      </div>
                      <Input
                        aria-label={`Gramos de ${r.foodName}`}
                        inputMode="decimal"
                        autoComplete="off"
                        className="w-20 font-mono"
                        value={r.amount}
                        onChange={(e) => setAmount(r.key, sanitizeDecimal(e.target.value, 1, 5))}
                      />
                      <span className="text-xs text-text-3">g</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Quitar ${r.foodName}`}
                        onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-text-3">
                Aún no hay ingredientes. Búscalos abajo.
              </p>
            )}

            {rows.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 rounded-md border border-border p-3 text-center">
                <div>
                  <p className="font-mono text-sm text-text">{formatNumber(Math.round(totals.kcal))}</p>
                  <p className="text-[11px] text-text-3">kcal</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-green">{formatNumber(Math.round(totals.proteinG))}</p>
                  <p className="text-[11px] text-text-3">prot. g</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-yellow">{formatNumber(Math.round(totals.carbsG))}</p>
                  <p className="text-[11px] text-text-3">carb. g</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-accent">{formatNumber(Math.round(totals.fatG))}</p>
                  <p className="text-[11px] text-text-3">grasa g</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipe-steps">Pasos (uno por línea)</Label>
            <Textarea
              id="recipe-steps"
              rows={4}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder={"Pica el tomate y la cebolla.\nSofríe con el aceite."}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipe-storage">Cómo guardarla (opcional)</Label>
            <Input
              id="recipe-storage"
              value={storage}
              maxLength={300}
              onChange={(e) => setStorage(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-search">Añadir ingrediente</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <Input
                id="recipe-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pollo, arroz, aguacate…"
                className="pl-9"
                autoComplete="off"
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {searching || (showFavorites && loadingFavorites) ? (
                <div className="space-y-2 py-1">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                (showFavorites ? favorites.map(favoriteToFood) : results).map((food) => (
                  <button
                    key={food.key}
                    type="button"
                    onClick={() => addFood(food)}
                    className="flex w-full items-center justify-between gap-3 rounded-sm border-b border-border px-2 py-2 text-left last:border-0 hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-text">{food.name}</span>
                      <span className="block font-mono text-xs text-text-3">
                        {formatNumber(food.kcal100g)} kcal/100 g
                      </span>
                    </span>
                    {food.source === "favorite" ? (
                      <Star className="h-3.5 w-3.5 shrink-0 fill-current text-accent" />
                    ) : null}
                  </button>
                ))
              )}
              {showFavorites && !loadingFavorites && favorites.length === 0 ? (
                <p className="py-2 text-xs text-text-3">
                  Escribe al menos 2 letras para buscar un alimento.
                </p>
              ) : null}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {recipe ? "Guardar cambios" : "Guardar receta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
