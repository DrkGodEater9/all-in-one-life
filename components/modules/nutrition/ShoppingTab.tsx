"use client";

import * as React from "react";
import { Minus, Plus, ShoppingBasket, X } from "lucide-react";
import { Button, Card, Checkbox, EmptyState, SectionHeader, Skeleton } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { ProductList } from "./ProductList";
import { formatCop } from "./RecipeDetailDialog";
import type { Recipe } from "./types";

export type PlanEntry = { id: number; servings: number };

type Line = {
  key: string;
  name: string;
  /** Suma por unidad ("und", "ml", "g"…): una misma compra puede mezclar unidades. */
  amounts: Map<string, number>;
  cost: number;
  recipes: Set<string>;
};

function amountText(amounts: Map<string, number>) {
  return [...amounts.entries()].map(([unit, n]) => `${formatNumber(Math.round(n * 100) / 100)} ${unit}`).join(" + ");
}

export function ShoppingTab({
  recipes,
  plan,
  onChange,
}: {
  recipes: Recipe[] | null;
  plan: PlanEntry[];
  onChange: (plan: PlanEntry[]) => void;
}) {
  const [done, setDone] = React.useState<Set<string>>(new Set());

  const planned = React.useMemo(
    () =>
      plan.flatMap((p) => {
        const recipe = recipes?.find((r) => r.id === p.id);
        return recipe ? [{ recipe, servings: p.servings }] : [];
      }),
    [plan, recipes]
  );

  const lines = React.useMemo(() => {
    const map = new Map<string, Line>();
    for (const { recipe, servings } of planned) {
      for (const item of recipe.items) {
        const key = item.foodName.trim().toLowerCase();
        const line =
          map.get(key) ?? { key, name: item.foodName, amounts: new Map(), cost: 0, recipes: new Set() };
        const hasQty = item.quantity != null && item.unit;
        const unit = hasQty ? item.unit! : "g";
        const amount = (hasQty ? item.quantity! : item.amountG) * servings;
        line.amounts.set(unit, (line.amounts.get(unit) ?? 0) + amount);
        line.cost += (item.costCop ?? 0) * servings;
        line.recipes.add(recipe.name);
        map.set(key, line);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [planned]);

  const total = lines.reduce((t, l) => t + l.cost, 0);

  function setServings(id: number, servings: number) {
    onChange(plan.map((p) => (p.id === id ? { ...p, servings: Math.max(1, Math.min(30, servings)) } : p)));
  }

  if (recipes === null) return <Skeleton className="h-40 w-full" />;

  if (planned.length === 0) {
    return (
      <div className="space-y-6">
        <ProductList />
        <EmptyState
          icon={ShoppingBasket}
          title="Arma tu propia compra"
          description='Abre una receta y pulsa "A compras"; aquí se suman los ingredientes de las que elijas.'
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProductList />
      <h2 className="pt-2 text-base font-semibold text-text">Según tus recetas elegidas</h2>
      <Card className="p-4">
        <SectionHeader title="Recetas de la compra" description="Cuántas porciones comerás de cada una." />
        <ul className="mt-3 divide-y divide-border">
          {planned.map(({ recipe, servings }) => (
            <li key={recipe.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-text">{recipe.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Menos porciones"
                onClick={() => setServings(recipe.id, servings - 1)}
              >
                <Minus />
              </Button>
              <span className="w-8 text-center font-mono text-sm">{servings}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Más porciones"
                onClick={() => setServings(recipe.id, servings + 1)}
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar ${recipe.name}`}
                onClick={() => onChange(plan.filter((p) => p.id !== recipe.id))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Qué comprar"
          description={
            total > 0
              ? `≈ ${formatCop(total)} de lo que consumes (los paquetes completos cuestan más)`
              : `${lines.length} ingredientes`
          }
        />
        <ul className="mt-3 divide-y divide-border">
          {lines.map((line) => {
            const checked = done.has(line.key);
            return (
              <li key={line.key} className="flex items-center gap-3 py-2">
                <Checkbox
                  checked={checked}
                  aria-label={`Comprado: ${line.name}`}
                  onCheckedChange={(v) =>
                    setDone((prev) => {
                      const next = new Set(prev);
                      if (v) next.add(line.key);
                      else next.delete(line.key);
                      return next;
                    })
                  }
                />
                <div className={"min-w-0 flex-1 " + (checked ? "opacity-50 line-through" : "")}>
                  <p className="truncate text-sm text-text">{line.name}</p>
                  <p className="truncate text-xs text-text-3">{[...line.recipes].join(" · ")}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm text-text">{amountText(line.amounts)}</p>
                  {line.cost > 0 ? <p className="font-mono text-xs text-text-3">{formatCop(line.cost)}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
