"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiClientError } from "@/lib/api";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@/components/ui";
import type { CreditLineDetail } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre").max(80),
  creditLimit: z.string().refine(
    (v) => v.trim() === "" || Number(v) > 0,
    "El cupo debe ser mayor que cero"
  ),
  totalDebt: z.string().refine(
    (v) => v.trim() === "" || Number(v) >= 0,
    "El total a pagar no puede ser negativo"
  ),
});

type Values = z.infer<typeof schema>;

export interface EditCreditLineDialogProps {
  line: CreditLineDetail | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function valuesOf(line: CreditLineDetail | null): Values {
  return {
    name: line?.name ?? "",
    creditLimit: line?.creditLimit != null ? String(line.creditLimit) : "",
    totalDebt: line?.totalDebt != null ? String(line.totalDebt) : "",
  };
}

export function EditCreditLineDialog({ line, onOpenChange, onSaved }: EditCreditLineDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: valuesOf(line),
  });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (line) form.reset(valuesOf(line));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?.id]);

  async function onSubmit(values: Values) {
    if (!line) return;
    const debtText = values.totalDebt.trim();
    const totalDebt = debtText === "" ? null : Number(debtText);

    try {
      await api.put(`/finance/credit-lines/${line.id}`, {
        name: values.name,
        creditLimit: values.creditLimit.trim() === "" ? null : Number(values.creditLimit),
        totalDebt,
      });
      toast({ title: "Crédito actualizado" });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar el crédito",
        description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    }
  }

  return (
    <Dialog open={line !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar crédito</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-credit-name">Nombre</Label>
              <Input id="edit-credit-name" {...form.register("name")} />
              {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-credit-limit">Cupo total (opcional)</Label>
              <Input
                id="edit-credit-limit"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="font-mono tabular-nums"
                {...form.register("creditLimit")}
              />
              {errors.creditLimit ? (
                <p className="text-xs text-danger">{errors.creditLimit.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-credit-debt">Total a pagar (opcional)</Label>
              <Input
                id="edit-credit-debt"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="font-mono tabular-nums"
                {...form.register("totalDebt")}
              />
              {errors.totalDebt ? (
                <p className="text-xs text-danger">{errors.totalDebt.message}</p>
              ) : (
                <p className="text-xs text-text-3">
                  Lo que pagarás en total. "Debes" es este total menos los pagos hechos; no afecta el cupo. Vacío = sin seguimiento.
                </p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
