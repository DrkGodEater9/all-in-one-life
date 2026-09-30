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
  toast,
} from "@/components/ui";
import { Segmented } from "./segmented";
import { sourceLabel } from "./finance-utils";
import type { Balance } from "./types";

const schema = z.object({
  direction: z.enum(["i_owe", "they_owe_me"]),
  person: z.string().trim().min(1, "Indica la persona").max(120),
  reason: z.string().trim().min(1, "Indica el motivo").max(240),
  amount: z
    .string()
    .min(1, "Indica el monto")
    .refine((v) => Number(v) > 0, "El monto debe ser mayor que cero"),
  sourceId: z.string().min(1, "Elige una fuente"),
  date: z.string().min(1, "Indica la fecha"),
});

type Values = z.infer<typeof schema>;

export interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: Balance | null;
  onCreated: () => void;
}

export function AddDebtDialog({
  open,
  onOpenChange,
  balance,
  onCreated,
}: AddDebtDialogProps) {
  const sources = balance?.sources ?? [];
  const defaultSourceId = sources.find((s) => s.name === "daily")?.id ?? sources[0]?.id;

  const defaults = React.useMemo<Values>(
    () => ({
      direction: "i_owe",
      person: "",
      reason: "",
      amount: "",
      sourceId: defaultSourceId ? String(defaultSourceId) : "",
      date: toDateKey(),
    }),
    [defaultSourceId]
  );

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults]);

  async function onSubmit(values: Values) {
    try {
      await api.post("/finance/debts", {
        direction: values.direction,
        person: values.person,
        reason: values.reason,
        amount: Number(values.amount),
        sourceId: Number(values.sourceId),
        date: values.date,
      });
      toast({ title: "Deuda registrada" });
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
          <DialogTitle>Nueva deuda</DialogTitle>
          <DialogDescription>
            Las deudas no mueven el saldo hasta que registres un pago.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <Controller
              control={form.control}
              name="direction"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label>Dirección</Label>
                  <Segmented
                    aria-label="Dirección de la deuda"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "i_owe", label: "Yo debo" },
                      { value: "they_owe_me", label: "Me deben" },
                    ]}
                    className="w-full [&>button]:flex-1"
                  />
                </div>
              )}
            />

            <div className="space-y-1.5">
              <Label htmlFor="debt-person">Persona</Label>
              <Input id="debt-person" placeholder="Nombre" {...form.register("person")} />
              {errors.person ? (
                <p className="text-xs text-danger">{errors.person.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-reason">Razón</Label>
              <Input
                id="debt-reason"
                placeholder="Motivo de la deuda"
                {...form.register("reason")}
              />
              {errors.reason ? (
                <p className="text-xs text-danger">{errors.reason.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="debt-amount">Monto</Label>
              <Input
                id="debt-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="font-mono text-base tabular-nums"
                {...form.register("amount")}
              />
              {errors.amount ? (
                <p className="text-xs text-danger">{errors.amount.message}</p>
              ) : null}
            </div>

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
                  {errors.sourceId ? (
                    <p className="text-xs text-danger">{errors.sourceId.message}</p>
                  ) : null}
                </div>
              )}
            />

            <div className="space-y-1.5">
              <Label htmlFor="debt-date">Fecha</Label>
              <Input id="debt-date" type="date" {...form.register("date")} />
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
