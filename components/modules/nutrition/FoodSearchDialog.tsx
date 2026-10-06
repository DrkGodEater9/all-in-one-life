"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Search, Star, Trash2 } from "lucide-react";
import {
  Badge,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@/components/ui";
import { api, qs } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import {
  MEAL_LABELS,
  STATE_LABELS,
  type Favorite,
  type FoodResult,
  type FoodState,
  type MealType,
} from "./types";

const STATES: FoodState[] = ["raw", "cooked", "unknown"];

const amountSchema = z.object({
  amountG: z
    .number({ invalid_type_error: "Escribe los gramos" })
    .positive("Debe ser mayor que 0")
    .max(10000, "Demasiado"),
  state: z.enum(["raw", "cooked", "unknown"]),
});
type AmountValues = z.infer<typeof amountSchema>;

function favoriteToResult(f: Favorite): FoodResult {
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

function FoodRow({
  food,
  onSelect,
  onDelete,
}: {
  food: FoodResult;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border last:border-0">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-sm px-2 py-2.5 text-left hover:bg-surface-2"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm text-text">{food.name}</span>
          <span className="mt-0.5 block font-mono text-xs text-text-3">
            {formatNumber(food.kcal100g)} kcal/100 g · P{" "}
            {formatNumber(food.protein100g)} · C {formatNumber(food.carbs100g)} · G{" "}
            {formatNumber(food.fat100g)}
          </span>
        </span>
        {food.source === "favorite" ? (
          <Badge variant="default" className="shrink-0">
            <Star className="fill-current" />
            Favorito
          </Badge>
        ) : null}
      </button>
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Quitar ${food.name} de favoritos`}
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      ) : null}
    </div>
  );
}

export function FoodSearchDialog({
  open,
  onOpenChange,
  mealType,
  date,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType;
  date: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<FoodResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  const [favorites, setFavorites] = React.useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = React.useState(false);

  const [selected, setSelected] = React.useState<FoodResult | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [savingFavorite, setSavingFavorite] = React.useState(false);

  const requestId = React.useRef(0);

  const form = useForm<AmountValues>({
    resolver: zodResolver(amountSchema),
    defaultValues: { amountG: 100, state: "unknown" },
  });
  const amountG = form.watch("amountG");
  const state = form.watch("state");

  const loadFavorites = React.useCallback(async () => {
    setLoadingFavorites(true);
    try {
      setFavorites(await api.get<Favorite[]>("/nutrition/favorites"));
    } catch {
      toast({ title: "No se pudieron cargar los favoritos", variant: "destructive" });
    } finally {
      setLoadingFavorites(false);
    }
  }, []);

  // Reinicia el estado cada vez que se abre el modal.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSearched(false);
    setSelected(null);
    form.reset({ amountG: 100, state: "unknown" });
    void loadFavorites();
  }, [open, form, loadFavorites]);

  // Debounce de 300 ms sobre el input de búsqueda.
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const id = ++requestId.current;
      try {
        const data = await api.get<FoodResult[]>(
          `/nutrition/search${qs({ q })}`
        );
        if (id !== requestId.current) return;
        setResults(data);
      } catch {
        if (id !== requestId.current) return;
        setResults([]);
        toast({ title: "La búsqueda de alimentos falló", variant: "destructive" });
      } finally {
        if (id === requestId.current) {
          setSearching(false);
          setSearched(true);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  const preview = React.useMemo(() => {
    if (!selected || !Number.isFinite(amountG)) return null;
    const factor = amountG / 100;
    return {
      kcal: Math.round(selected.kcal100g * factor),
      proteinG: Math.round(selected.protein100g * factor),
      carbsG: Math.round(selected.carbs100g * factor),
      fatG: Math.round(selected.fat100g * factor),
    };
  }, [selected, amountG]);

  async function onSubmit(values: AmountValues) {
    if (!selected) return;
    setSaving(true);
    try {
      const meal = await api.post<{ id: number }>("/nutrition/log/meal", {
        date,
        mealType,
      });
      await api.post(`/nutrition/log/meal/${meal.id}/item`, {
        favoriteId: selected.favoriteId ?? undefined,
        foodCacheId: selected.foodCacheId ?? undefined,
        foodName: selected.name,
        kcal100g:
          selected.favoriteId === null && selected.foodCacheId === null
            ? selected.kcal100g
            : undefined,
        amountG: values.amountG,
        state: values.state,
      });
      toast({
        title: "Alimento registrado",
        description: `${selected.name} · ${formatNumber(values.amountG)} g`,
      });
      onAdded();
      onOpenChange(false);
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

  async function saveAsFavorite() {
    if (!selected || selected.favoriteId !== null) return;
    setSavingFavorite(true);
    try {
      await api.post("/nutrition/favorites", {
        name: selected.name,
        kcal100g: selected.kcal100g,
        protein100g: selected.protein100g,
        carbs100g: selected.carbs100g,
        fat100g: selected.fat100g,
        defaultUnit: "g",
      });
      toast({ title: "Guardado en favoritos" });
      await loadFavorites();
    } catch (error) {
      toast({
        title: "No se pudo guardar el favorito",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSavingFavorite(false);
    }
  }

  async function deleteFavorite(id: number) {
    try {
      await api.delete(`/nutrition/favorites/${id}`);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "Favorito eliminado" });
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Añadir a {MEAL_LABELS[mealType]}</DialogTitle>
          <DialogDescription>
            Busca en OpenFoodFacts o usa tus favoritos guardados.
          </DialogDescription>
        </DialogHeader>

        {selected ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <DialogBody className="space-y-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1.5 text-xs text-text-2 hover:text-text"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a la búsqueda
              </button>

              <div className="rounded-md border border-border bg-surface-2 p-3">
                <p className="text-sm text-text">{selected.name}</p>
                <p className="mt-0.5 font-mono text-xs text-text-3">
                  {formatNumber(selected.kcal100g)} kcal/100 g
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amountG">Cantidad (g)</Label>
                <Input
                  id="amountG"
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="1"
                  className="font-mono"
                  {...form.register("amountG", { valueAsNumber: true })}
                />
                {form.formState.errors.amountG ? (
                  <p className="text-xs text-danger">
                    {form.formState.errors.amountG.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>Estado</Label>
                <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-surface p-1">
                  {STATES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        form.setValue("state", s, { shouldDirty: true })
                      }
                      className={
                        "rounded-sm px-2 py-1.5 text-xs font-medium transition-colors " +
                        (state === s
                          ? "bg-surface-2 text-text"
                          : "text-text-2 hover:text-text")
                      }
                      aria-pressed={state === s}
                    >
                      {STATE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {preview ? (
                <div className="grid grid-cols-4 gap-2 rounded-md border border-border p-3 text-center">
                  <div>
                    <p className="font-mono text-sm text-text">{preview.kcal}</p>
                    <p className="text-[11px] text-text-3">kcal</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-green">
                      {preview.proteinG}
                    </p>
                    <p className="text-[11px] text-text-3">prot. g</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-yellow">
                      {preview.carbsG}
                    </p>
                    <p className="text-[11px] text-text-3">carb. g</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-accent">{preview.fatG}</p>
                    <p className="text-[11px] text-text-3">grasa g</p>
                  </div>
                </div>
              ) : null}
            </DialogBody>

            <DialogFooter>
              {selected.favoriteId === null ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveAsFavorite}
                  disabled={savingFavorite}
                >
                  {savingFavorite ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Star />
                  )}
                  Guardar favorito
                </Button>
              ) : null}
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                Añadir
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogBody>
            <Tabs defaultValue="search">
              <TabsList className="w-full">
                <TabsTrigger value="search" className="flex-1">
                  Buscar
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex-1">
                  Mis favoritos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
                  <Input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Pollo, avena, yogur…"
                    className="pl-9"
                    aria-label="Buscar alimento"
                  />
                </div>

                <div className="mt-3 max-h-[46dvh] overflow-y-auto">
                  {searching ? (
                    <div className="space-y-2 py-2">
                      <Skeleton className="h-11 w-full" />
                      <Skeleton className="h-11 w-full" />
                      <Skeleton className="h-11 w-full" />
                    </div>
                  ) : results.length > 0 ? (
                    results.map((food) => (
                      <FoodRow
                        key={food.key}
                        food={food}
                        onSelect={() => setSelected(food)}
                      />
                    ))
                  ) : searched ? (
                    <EmptyState
                      icon={Search}
                      title="Sin resultados"
                      description="Prueba con otro nombre o registra el alimento desde tus favoritos."
                    />
                  ) : (
                    <EmptyState
                      icon={Search}
                      title="Escribe al menos 2 letras"
                      description="Buscamos en tu caché local y en OpenFoodFacts."
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="favorites">
                <div className="max-h-[52dvh] overflow-y-auto">
                  {loadingFavorites ? (
                    <div className="space-y-2 py-2">
                      <Skeleton className="h-11 w-full" />
                      <Skeleton className="h-11 w-full" />
                    </div>
                  ) : favorites.length > 0 ? (
                    favorites.map((f) => (
                      <FoodRow
                        key={f.id}
                        food={favoriteToResult(f)}
                        onSelect={() => setSelected(favoriteToResult(f))}
                        onDelete={() => void deleteFavorite(f.id)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={Star}
                      title="Todavía no tienes favoritos"
                      description="Busca un alimento y guárdalo para tenerlo siempre a mano."
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}
