"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiClientError } from "@/lib/api";
import { toDateKey } from "@/lib/utils";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@/components/ui";
import { FINANCE_CATEGORIES } from "./constants";
import { Segmented } from "./segmented";
import { sourceLabel } from "./finance-utils";
import type { Balance } from "./types";

const schema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z
    .string()
    .min(1, "Indica el monto")
    .refine((v) => Number(v) > 0, "El monto debe ser mayor que cero"),
  category: z.enum(FINANCE_CATEGORIES),
  sourceId: z.string().min(1, "Elige una fuente"),
  date: z.string().min(1, "Indica la fecha"),
  notes: z.string().max(500, "Máximo 500 caracteres").optional(),
});

type Values = z.infer<typeof schema>;

export interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: Balance | null;
  onCreated: () => void;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  balance,
  onCreated,
}: AddTransactionDialogProps) {
  const sources = balance?.sources ?? [];
  const defaultSourceId = sources.find((s) => s.name === "daily")?.id ?? sources[0]?.id;

  const defaults = React.useMemo<Values>(
    () => ({
      type: "expense",
      amount: "",
      category: "alimentación",
      sourceId: defaultSourceId ? String(defaultSourceId) : "",
      date: toDateKey(),
      notes: "",
    }),
    [defaultSourceId]
  );

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { isSubmitting } = form.formState;

  React.useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults]);

  async function onSubmit(values: Values) {
    try {
      await api.post("/finance/transactions", {
        type: values.type,
        amount: Number(values.amount),
        category: values.category,
        sourceId: Number(values.sourceId),
        date: values.date,
        notes: values.notes?.trim() || null,
      });
      toast({
        title: values.type === "income" ? "Ingreso registrado" : "Gasto registrado",
      });
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description:
          error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva transacción</DialogTitle>
          <DialogDescription>
            El saldo de la fuente se actualiza automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Segmented
                    aria-label="Tipo de transacción"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "expense", label: "Gasto" },
                      { value: "income", label: "Ingreso" },
                    ]}
                    className="w-full [&>button]:flex-1"
                  />
                </div>
              )}
            />

            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Monto</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="font-mono text-base tabular-nums"
                {...form.register("amount")}
              />
              {form.formState.errors.amount ? (
                <p className="text-xs text-danger">
                  {form.formState.errors.amount.message}
                </p>
              ) : null}
            </div>

            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          <span className="capitalize">{category}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="sourceId"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label>Fuente</Label>
                  <Segmented
                    aria-label="Fuente"
                    value={field.value}
                    onChange={field.onChange}
                    options={sources.map((s) => ({
                      value: String(s.id),
                      label: sourceLabel(s.name),
                    }))}
                    className="w-full [&>button]:flex-1"
                  />
                  {form.formState.errors.sourceId ? (
                    <p className="text-xs text-danger">
                      {form.formState.errors.sourceId.message}
                    </p>
                  ) : null}
                </div>
              )}
            />

            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Fecha</Label>
              <Input id="tx-date" type="date" {...form.register("date")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-notes">Notas</Label>
              <Textarea
                id="tx-notes"
                rows={2}
                placeholder="Opcional"
                {...form.register("notes")}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
