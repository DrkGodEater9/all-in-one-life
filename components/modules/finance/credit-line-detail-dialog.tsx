"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Pencil, Trash2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney, toDateKey } from "@/lib/utils";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Progress,
  Separator,
  Skeleton,
  toast,
} from "@/components/ui";
import { Segmented } from "./segmented";
import { EditCreditLineDialog } from "./edit-credit-line-dialog";
import { creditLineProgress, formatDateLabel } from "./finance-utils";
import type { CreditLineDetail, CreditMovement } from "./types";

const schema = z.object({
  type: z.enum(["withdrawal", "payment"]),
  amount: z
    .string()
    .min(1, "Indica el monto")
    .refine((v) => Number(v) > 0, "El monto debe ser mayor que cero"),
  date: z.string().min(1, "Indica la fecha"),
  notes: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

export interface CreditLineDetailDialogProps {
  creditLineId: number | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function CreditLineDetailDialog({
  creditLineId,
  onOpenChange,
  onChanged,
}: CreditLineDetailDialogProps) {
  const [line, setLine] = React.useState<CreditLineDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: "withdrawal", amount: "", date: toDateKey(), notes: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const type = form.watch("type");

  const load = React.useCallback(() => {
    if (creditLineId === null) return;
    setLoading(true);
    api
      .get<CreditLineDetail>(`/finance/credit-lines/${creditLineId}`)
      .then(setLine)
      .catch((error: unknown) => {
        toast({
          variant: "destructive",
          title: "No se pudo cargar la línea de crédito",
          description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
        });
      })
      .finally(() => setLoading(false));
  }, [creditLineId]);

  React.useEffect(() => {
    if (creditLineId === null) return;
    form.reset({ type: "withdrawal", amount: "", date: toDateKey(), notes: "" });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditLineId]);

  async function onSubmit(values: Values) {
    if (creditLineId === null) return;
    try {
      await api.post(`/finance/credit-lines/${creditLineId}/movements`, {
        type: values.type,
        amount: Number(values.amount),
        date: values.date,
        notes: values.notes?.trim() || undefined,
      });
      toast({ title: values.type === "withdrawal" ? "Retiro registrado" : "Pago registrado" });
      form.reset({ type: values.type, amount: "", date: toDateKey(), notes: "" });
      load();
      onChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar el movimiento",
        description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    }
  }

  async function deleteMovement(movement: CreditMovement) {
    if (creditLineId === null) return;
    try {
      await api.delete(`/finance/credit-lines/${creditLineId}/movements/${movement.id}`);
      toast({ title: "Movimiento eliminado" });
      load();
      onChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    }
  }

  const progress = line ? creditLineProgress(line) : 0;

  return (
    <Dialog open={creditLineId !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {loading && !line ? (
          <DialogBody className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </DialogBody>
        ) : line ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>{line.name}</DialogTitle>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-2 transition-colors hover:text-accent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <a
                  href={`/api/finance/credit-lines/${line.id}/export`}
                  className="inline-flex items-center gap-1.5 text-xs text-text-2 transition-colors hover:text-accent"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </a>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-5">
              <div className="space-y-2">
                {line.owed !== null ? (
                  <p className="font-mono text-sm tabular-nums text-text">
                    Debes {formatMoney(line.owed)}
                  </p>
                ) : null}
                {line.limit !== null ? (
                  <>
                    <Progress value={progress} />
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-mono tabular-nums text-text-2">
                        Usado {formatMoney(line.used)} / {formatMoney(line.limit)}
                      </span>
                      <span className="font-mono tabular-nums text-text">
                        Disponible {formatMoney(line.available ?? 0)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="font-mono text-sm tabular-nums text-text">
                    Usado {formatMoney(line.used)}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                  Historial
                </p>
                {line.movements.length === 0 ? (
                  <p className="text-xs text-text-3">Todavía no hay movimientos.</p>
                ) : (
                  <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                    {line.movements.map((movement) => (
                      <li
                        key={movement.id}
                        className="group flex items-center justify-between gap-2 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="text-text-2">{formatDateLabel(movement.date)}</span>
                          {movement.notes ? (
                            <span className="ml-2 truncate text-text-3">{movement.notes}</span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={
                              "font-mono tabular-nums " +
                              (movement.type === "withdrawal" ? "text-danger" : "text-success")
                            }
                          >
                            {movement.type === "withdrawal" ? "−" : "+"}
                            {formatMoney(movement.amount)}
                          </span>
                          <button
                            type="button"
                            aria-label="Eliminar movimiento"
                            onClick={() => deleteMovement(movement)}
                            className="text-text-3 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separator />

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                  Registrar movimiento
                </p>

                <Segmented
                  value={type}
                  onChange={(v) => form.setValue("type", v)}
                  options={[
                    { value: "withdrawal", label: "Retiro" },
                    { value: "payment", label: "Pago" },
                  ]}
                  aria-label="Tipo de movimiento"
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="mov-amount">Monto</Label>
                    <Input
                      id="mov-amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="font-mono tabular-nums"
                      {...form.register("amount")}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="mov-date">Fecha</Label>
                    <Input id="mov-date" type="date" {...form.register("date")} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mov-notes">Nota (opcional)</Label>
                  <Input id="mov-notes" placeholder="¿Para qué fue?" {...form.register("notes")} />
                </div>

                {errors.amount ? (
                  <p className="text-xs text-danger">{errors.amount.message}</p>
                ) : null}
                {errors.date ? <p className="text-xs text-danger">{errors.date.message}</p> : null}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Guardando…" : type === "withdrawal" ? "Registrar retiro" : "Registrar pago"}
                </Button>
              </form>
            </DialogBody>
          </>
        ) : null}
      </DialogContent>

      <EditCreditLineDialog
        line={editing ? line : null}
        onOpenChange={setEditing}
        onSaved={() => {
          load();
          onChanged();
        }}
      />
    </Dialog>
  );
}
