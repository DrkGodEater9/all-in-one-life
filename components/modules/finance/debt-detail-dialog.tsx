"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney, toDateKey } from "@/lib/utils";
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Progress,
  Separator,
  Skeleton,
  toast,
} from "@/components/ui";
import { DIRECTION_LABELS } from "./constants";
import { formatDateLabel, sourceLabel } from "./finance-utils";
import type { Debt, DebtPayment } from "./types";

const schema = z.object({
  amount: z
    .string()
    .min(1, "Indica el monto")
    .refine((v) => Number(v) > 0, "El monto debe ser mayor que cero"),
  date: z.string().min(1, "Indica la fecha"),
});

type Values = z.infer<typeof schema>;

export interface DebtDetailDialogProps {
  debt: Debt | null;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
}

export function DebtDetailDialog({ debt, onOpenChange, onPaid }: DebtDetailDialogProps) {
  const [payments, setPayments] = React.useState<DebtPayment[]>([]);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", date: toDateKey() },
  });
  const { errors, isSubmitting } = form.formState;

  const debtId = debt?.id ?? null;
  const pending = debt ? Math.round((debt.amount - debt.amountPaid) * 100) / 100 : 0;
  const progress = debt && debt.amount > 0 ? (debt.amountPaid / debt.amount) * 100 : 0;

  React.useEffect(() => {
    if (debtId === null) return;
    let cancelled = false;
    setLoading(true);
    form.reset({ amount: "", date: toDateKey() });

    api
      .get<DebtPayment[]>(`/finance/debts/${debtId}/payments`)
      .then((data) => {
        if (!cancelled) setPayments(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "No se pudo cargar el historial",
          description:
            error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtId]);

  async function onSubmit(values: Values) {
    if (!debt) return;
    try {
      await api.post(`/finance/debts/${debt.id}/pay`, {
        amount: Number(values.amount),
        date: values.date,
      });
      toast({ title: "Pago registrado" });
      onOpenChange(false);
      onPaid();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar el pago",
        description:
          error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    }
  }

  return (
    <Dialog open={debt !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {debt ? (
          <>
            <DialogHeader>
              <DialogTitle>{debt.person}</DialogTitle>
              <DialogDescription>{debt.reason}</DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={debt.direction === "i_owe" ? "danger" : "success"}>
                    {DIRECTION_LABELS[debt.direction]}
                  </Badge>
                  <Badge variant="neutral">{sourceLabel(debt.source.name)}</Badge>
                  <span className="text-[11px] text-text-3">
                    {formatDateLabel(debt.date)}
                  </span>
                  {debt.isSettled ? <Badge variant="success">Saldada</Badge> : null}
                </div>

                <Progress
                  value={progress}
                  indicatorClassName={debt.isSettled ? "bg-success" : undefined}
                />

                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-mono tabular-nums text-text-2">
                    {formatMoney(debt.amountPaid)} / {formatMoney(debt.amount)}
                  </span>
                  <span className="font-mono tabular-nums text-text">
                    Pendiente {formatMoney(pending)}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                  Historial de pagos
                </p>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : payments.length === 0 ? (
                  <p className="text-xs text-text-3">Todavía no hay pagos registrados.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex items-center justify-between py-2 text-xs"
                      >
                        <span className="text-text-2">
                          {formatDateLabel(payment.date)}
                        </span>
                        <span className="font-mono tabular-nums text-text">
                          {formatMoney(payment.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {debt.isSettled ? null : (
                <>
                  <Separator />
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                      Registrar pago
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="pay-amount">Monto</Label>
                        <Input
                          id="pay-amount"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          max={pending}
                          placeholder="0.00"
                          className="font-mono tabular-nums"
                          {...form.register("amount")}
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="pay-date">Fecha</Label>
                        <Input id="pay-date" type="date" {...form.register("date")} />
                      </div>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Guardando…" : "Pagar"}
                      </Button>
                    </div>

                    {errors.amount ? (
                      <p className="text-xs text-danger">{errors.amount.message}</p>
                    ) : null}
                    {errors.date ? (
                      <p className="text-xs text-danger">{errors.date.message}</p>
                    ) : null}
                  </form>
                </>
              )}
            </DialogBody>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
