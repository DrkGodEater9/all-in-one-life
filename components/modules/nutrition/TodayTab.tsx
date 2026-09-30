"use client";

import * as React from "react";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  Skeleton,
  toast,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { FoodSearchDialog } from "./FoodSearchDialog";
import {
  MEAL_LABELS,
  MEAL_TYPES,
  STATE_LABELS,
  type DayLog,
  type MealItem,
  type MealType,
} from "./types";

function ItemRow({
  item,
  onDelete,
}: {
  item: MealItem;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-2 border-t border-border py-2.5 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm text-text">
          <span className="truncate">{item.foodName}</span>
          {item.isEstimated ? (
            <Badge variant="neutral" className="shrink-0">
              estimado
            </Badge>
          ) : null}
        </p>
        <p className="mt-0.5 font-mono text-xs text-text-3">
          {formatNumber(item.amountG)} g
          {item.state !== "unknown" ? ` · ${STATE_LABELS[item.state]}` : ""} · P{" "}
          {formatNumber(item.proteinG)} · C {formatNumber(item.carbsG)} · G{" "}
          {formatNumber(item.fatG)}
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm text-text">
        {formatNumber(item.kcal)}
        <span className="text-text-3"> kcal</span>
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Eliminar ${item.foodName}`}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

export function TodayTab({
  date,
  log,
  loading,
  onChanged,
}: {
  date: string;
  log: DayLog | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const [dialogMeal, setDialogMeal] = React.useState<MealType | null>(null);

  const byType = React.useMemo(() => {
    const map = new Map<MealType, MealItem[]>();
    for (const meal of log?.meals ?? []) map.set(meal.mealType, meal.items);
    return map;
  }, [log]);

  async function deleteItem(id: number) {
    try {
      await api.delete(`/nutrition/log/item/${id}`);
      toast({ title: "Item eliminado" });
      onChanged();
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {MEAL_TYPES.map((t) => (
          <Skeleton key={t} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {MEAL_TYPES.map((mealType) => {
        const items = byType.get(mealType) ?? [];
        const kcal = items.reduce((sum, i) => sum + i.kcal, 0);

        return (
          <Card key={mealType} className="p-4">
            <SectionHeader
              title={MEAL_LABELS[mealType]}
              description={
                items.length > 0
                  ? `${items.length} ${items.length === 1 ? "alimento" : "alimentos"} · ${formatNumber(kcal)} kcal`
                  : "Sin registros"
              }
              action={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  aria-label={`Añadir alimento a ${MEAL_LABELS[mealType]}`}
                  onClick={() => setDialogMeal(mealType)}
                >
                  <Plus />
                </Button>
              }
            />

            {items.length > 0 ? (
              <ul className="mt-3">
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onDelete={() => void deleteItem(item.id)}
                  />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={UtensilsCrossed}
                title="Nada registrado todavía"
                className="py-6"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogMeal(mealType)}
                  >
                    <Plus />
                    Añadir alimento
                  </Button>
                }
              />
            )}
          </Card>
        );
      })}

      {dialogMeal ? (
        <FoodSearchDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialogMeal(null);
          }}
          mealType={dialogMeal}
          date={date}
          onAdded={onChanged}
        />
      ) : null}
    </div>
  );
}
