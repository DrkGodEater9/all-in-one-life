"use client";

import * as React from "react";
import { Check, Clock, Pencil, ShoppingBasket, Snowflake, Trash2 } from "lucide-react";
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
} from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { MEAL_LABELS, type Recipe } from "./types";

export function formatCop(n: number) {
  return `$${formatNumber(Math.round(n))}`;
}

/** Cantidad tal como se cocina: "4 und", "250 ml" o, si no hay, los gramos. */
export function itemAmountLabel(item: Recipe["items"][number]) {
  if (item.quantity != null && item.unit) return `${formatNumber(item.quantity)} ${item.unit}`;
  return `${formatNumber(item.amountG)} g`;
}

export function MacroLine({ recipe }: { recipe: Recipe }) {
  const t = recipe.totals;
  return (
    <p className="font-mono text-xs text-text-3">
      <span className="text-sm text-text">{formatNumber(Math.round(t.kcal))} kcal</span>
      {" · "}
      <span className="text-green">P {formatNumber(Math.round(t.proteinG))}</span>
      {" · "}
      <span className="text-yellow">C {formatNumber(Math.round(t.carbsG))}</span>
      {" · "}
      <span className="text-accent">G {formatNumber(Math.round(t.fatG))}</span>
    </p>
  );
}

export function RecipeDetailDialog({
  recipe,
  inPlan,
  onClose,
  onLog,
  onEdit,
  onDelete,
  onTogglePlan,
}: {
  recipe: Recipe;
  inPlan: boolean;
  onClose: () => void;
  onLog: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePlan: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-balance">{recipe.name}</DialogTitle>
          <DialogDescription>
            {[
              recipe.groupName,
              recipe.mealType ? MEAL_LABELS[recipe.mealType] : null,
              recipe.servings > 1 ? `rinde ${recipe.servings} porciones` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Receta"}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {recipe.description ? <p className="text-sm text-text-2">{recipe.description}</p> : null}

          <div className="flex flex-wrap items-center gap-2">
            <MacroLine recipe={recipe} />
            {recipe.prepMinutes != null ? (
              <Badge variant="neutral" className="gap-1">
                <Clock className="h-3 w-3" />
                {recipe.prepMinutes} min
              </Badge>
            ) : null}
            {recipe.costCop != null ? <Badge variant="neutral">{formatCop(recipe.costCop)} / porción</Badge> : null}
          </div>

          <section className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-3">Ingredientes</h3>
            <ul className="rounded-md border border-border">
              {recipe.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-1.5 text-sm first:border-t-0"
                >
                  <span className="min-w-0 truncate text-text">{item.foodName}</span>
                  <span className="shrink-0 font-mono text-xs text-text-3">{itemAmountLabel(item)}</span>
                </li>
              ))}
            </ul>
          </section>

          {recipe.steps.length > 0 ? (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-3">
                Paso a paso{recipe.prepMinutes != null ? ` · ${recipe.prepMinutes} min` : ""}
              </h3>
              <ol className="space-y-2">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-text-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-xs text-text">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      {step.text}
                      {step.minutes ? (
                        <span className="ml-1.5 whitespace-nowrap font-mono text-xs text-text-3">· {step.minutes} min</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {recipe.storage || recipe.fridgeDays != null ? (
            <section className="flex gap-2 rounded-md border border-border p-3 text-sm text-text-2">
              <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-text-3" />
              <p>
                {recipe.storage}
                {recipe.fridgeDays != null ? ` (dura ${recipe.fridgeDays} ${recipe.fridgeDays === 1 ? "día" : "días"} en nevera)` : ""}
              </p>
            </section>
          ) : null}

          {recipe.tips.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-text-3">
              {recipe.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          ) : null}
        </DialogBody>

        {/* Móvil: "Hoy comí esto" arriba a lo ancho y las acciones debajo; escritorio: en una fila. */}
        <DialogFooter className="sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={`Eliminar ${recipe.name}`} onClick={onDelete}>
              <Trash2 />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Editar ${recipe.name}`} onClick={onEdit}>
              <Pencil />
            </Button>
            <Button
              variant={inPlan ? "default" : "secondary"}
              className="flex-1 sm:flex-none"
              onClick={onTogglePlan}
            >
              <ShoppingBasket />
              {inPlan ? "En compras" : "A compras"}
            </Button>
          </div>
          <Button className="w-full sm:w-auto" onClick={onLog}>
            <Check />
            Hoy comí esto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
