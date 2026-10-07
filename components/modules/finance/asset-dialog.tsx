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
  Textarea,
  toast,
} from "@/components/ui";
import { MAX_QUANTITY, decimalField, numberText } from "./form-fields";
import type { Asset } from "./types";

const schema = z.object({
  title: z.string().trim().min(1, "Indica un título").max(160),
  quantity: numberText({ label: "la cantidad", decimals: 4, max: MAX_QUANTITY }),
  unit: z.string().max(32).optional(),
  priceEach: numberText({ label: "el precio", required: false, positive: false }),
  notes: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

export interface AssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene, el diálogo edita en lugar de crear. */
  asset?: Asset | null;
  onSaved: () => void;
}

export function AssetDialog({ open, onOpenChange, asset, onSaved }: AssetDialogProps) {
  const defaults = React.useMemo<Values>(
    () => ({
      title: asset?.title ?? "",
      quantity: asset ? String(asset.quantity) : "",
      unit: asset?.unit ?? "",
      priceEach: asset?.priceEach != null ? String(asset.priceEach) : "",
      notes: asset?.notes ?? "",
    }),
    [asset]
  );

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults]);

  async function onSubmit(values: Values) {
    const payload = {
      title: values.title,
      quantity: Number(values.quantity),
      unit: values.unit?.trim() || null,
      priceEach: values.priceEach?.trim() ? Number(values.priceEach) : null,
      notes: values.notes?.trim() || null,
    };

    try {
      if (asset) {
        await api.put(`/finance/assets/${asset.id}`, payload);
        toast({ title: "Activo actualizado" });
      } else {
        await api.post("/finance/assets", payload);
        toast({ title: "Activo agregado" });
      }
      onOpenChange(false);
      onSaved();
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
          <DialogTitle>{asset ? "Editar activo" : "Nuevo activo"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset-title">Título</Label>
              <Input
                id="asset-title"
                placeholder="Ej. Bicicleta"
                {...form.register("title")}
              />
              {errors.title ? (
                <p className="text-xs text-danger">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asset-quantity">Cantidad</Label>
                <Input
                  id="asset-quantity"
                  className="font-mono tabular-nums"
                  {...decimalField(form.register("quantity"), 4, 8)}
                />
                {errors.quantity ? (
                  <p className="text-xs text-danger">{errors.quantity.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asset-unit">Unidad</Label>
                <Input
                  id="asset-unit"
                  placeholder="g, u, m²…"
                  {...form.register("unit")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-price">Precio estimado por unidad</Label>
              <Input
                id="asset-price"
                placeholder="Opcional"
                className="font-mono tabular-nums"
                {...decimalField(form.register("priceEach"))}
              />
              {errors.priceEach ? (
                <p className="text-xs text-danger">{errors.priceEach.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-notes">Notas</Label>
              <Textarea
                id="asset-notes"
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
