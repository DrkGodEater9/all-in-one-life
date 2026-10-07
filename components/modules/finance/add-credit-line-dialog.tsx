"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiClientError } from "@/lib/api";
import { decimalField, numberText } from "./form-fields";
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

const schema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre").max(80),
  creditLimit: numberText({ label: "el cupo", required: false }),
  totalDebt: numberText({ label: "el total", required: false, positive: false }),
});

type Values = z.infer<typeof schema>;

export interface AddCreditLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddCreditLineDialog({ open, onOpenChange, onCreated }: AddCreditLineDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", creditLimit: "", totalDebt: "" },
  });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (open) form.reset({ name: "", creditLimit: "", totalDebt: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: Values) {
    try {
      await api.post("/finance/credit-lines", {
        name: values.name,
        creditLimit: values.creditLimit.trim() === "" ? null : Number(values.creditLimit),
        totalDebt: values.totalDebt.trim() === "" ? null : Number(values.totalDebt),
      });
      toast({ title: "Línea de crédito creada" });
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo crear la línea de crédito",
        description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva línea de crédito</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="credit-name">Nombre</Label>
              <Input
                id="credit-name"
                placeholder="Ej: Bancolombia, Nu…"
                autoFocus
                {...form.register("name")}
              />
              {errors.name ? (
                <p className="text-xs text-danger">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credit-limit">Cupo total (opcional)</Label>
              <Input
                id="credit-limit"
                placeholder="0.00"
                className="font-mono tabular-nums"
                {...decimalField(form.register("creditLimit"))}
              />
              {errors.creditLimit ? (
                <p className="text-xs text-danger">{errors.creditLimit.message}</p>
              ) : (
                <p className="text-xs text-text-3">
                  Déjalo vacío si no quieres ver el disponible.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credit-debt">Total a pagar (opcional)</Label>
              <Input
                id="credit-debt"
                placeholder="0.00"
                className="font-mono tabular-nums"
                {...decimalField(form.register("totalDebt"))}
              />
              {errors.totalDebt ? (
                <p className="text-xs text-danger">{errors.totalDebt.message}</p>
              ) : (
                <p className="text-xs text-text-3">
                  Lo que pagarás en total. &quot;Debes&quot; será este total menos tus pagos; no afecta el cupo.
                </p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
