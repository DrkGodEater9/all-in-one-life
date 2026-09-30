"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Receipt, RotateCcw, Trash2 } from "lucide-react";
import { api, ApiClientError, qs } from "@/lib/api";
import { cn, formatMoney, toDateKey } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Stat,
  toast,
} from "@/components/ui";
import { FINANCE_CATEGORIES } from "./constants";
import { Segmented } from "./segmented";
import {
  currentMonthKey,
  dateKeyMonthsAgo,
  formatDateLabel,
  formatMonthLabel,
  signedMoney,
} from "./finance-utils";
import { buildSingleSourceSeries } from "./chart-data";

// recharts pesa ~100 kB y solo hace falta cuando este modal está abierto.
// Cargándolo con `dynamic` sale del bundle inicial de /finance.
const SingleBalanceChart = dynamic(
  () => import("./balance-chart").then((m) => m.SingleBalanceChart),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> }
);
const ExpenseDonut = dynamic(
  () => import("./expense-donut").then((m) => m.ExpenseDonut),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> }
);
import type { MonthlySummary, Transaction } from "./types";

/** Forma de `balance.sources`, sin `createdAt` (no hace falta aquí). */
export interface WalletSource {
  id: number;
  name: string;
  balance: number;
}

const addSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z
    .string()
    .min(1, "Indica el monto")
    .refine((v) => Number(v) > 0, "El monto debe ser mayor que cero"),
  category: z.enum(FINANCE_CATEGORIES),
  date: z.string().min(1, "Indica la fecha"),
  notes: z.string().max(500).optional(),
});

type AddValues = z.infer<typeof addSchema>;

type LocalFilters = {
  type: "all" | "expense" | "income";
  category: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: LocalFilters = { type: "all", category: "all", from: "", to: "" };

export interface WalletDetailDialogProps {
  source: WalletSource | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

/**
 * Vista completa de UNA billetera (Diario o Ahorros): filtros, gráficas y
 * movimientos, igual que la antigua pestaña "Transacciones" pero scoped a
 * un solo `sourceId` en vez de mostrar todo mezclado. Se abre en modal al
 * hacer click en la tarjeta de la billetera, a pedido del usuario.
 */
export function WalletDetailDialog({ source, onOpenChange, onChanged }: WalletDetailDialogProps) {
  const [filters, setFilters] = React.useState<LocalFilters>(EMPTY_FILTERS);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [history, setHistory] = React.useState<Transaction[]>([]);
  const [summary, setSummary] = React.useState<MonthlySummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const sourceId = source?.id ?? null;
  const month = currentMonthKey();

  const addForm = useForm<AddValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { type: "expense", amount: "", category: "alimentación", date: toDateKey(), notes: "" },
  });

  const query = qs({
    sourceId: sourceId ?? undefined,
    type: filters.type === "all" ? undefined : filters.type,
    category: filters.category === "all" ? undefined : filters.category,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });

  const load = React.useCallback(() => {
    if (sourceId === null) return;
    setLoading(true);
    Promise.all([
      api.get<Transaction[]>(`/finance/transactions${query}`),
      api.get<MonthlySummary>(`/finance/summary/monthly${qs({ month, sourceId })}`),
      api.get<Transaction[]>(
        `/finance/transactions${qs({ sourceId, from: dateKeyMonthsAgo(6) })}`
      ),
    ])
      .then(([list, monthly, recent]) => {
        setTransactions(list);
        setSummary(monthly);
        setHistory(recent);
      })
      .catch((error: unknown) => {
        toast({
          variant: "destructive",
          title: "No se pudieron cargar los movimientos",
          description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, query, month]);

  React.useEffect(() => {
    if (sourceId === null) return;
    setFilters(EMPTY_FILTERS);
    addForm.reset({ type: "expense", amount: "", category: "alimentación", date: toDateKey(), notes: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  async function onAddSubmit(values: AddValues) {
    if (sourceId === null) return;
    try {
      await api.post("/finance/transactions", {
        type: values.type,
        amount: Number(values.amount),
        category: values.category,
        sourceId,
        date: values.date,
        notes: values.notes?.trim() || null,
      });
      toast({ title: values.type === "income" ? "Ingreso registrado" : "Gasto registrado" });
      addForm.reset({ type: values.type, amount: "", category: values.category, date: toDateKey(), notes: "" });
      load();
      onChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    }
  }

  React.useEffect(() => {
    load();
  }, [load]);

  const series = React.useMemo(
    () => (source ? buildSingleSourceSeries(history, source.balance, source.id) : []),
    [history, source]
  );

  const hasFilters =
    filters.type !== "all" || filters.category !== "all" || filters.from !== "" || filters.to !== "";

  async function handleDelete(transaction: Transaction) {
    setDeletingId(transaction.id);
    try {
      await api.delete(`/finance/transactions/${transaction.id}`);
      toast({ title: "Transacción eliminada", description: "El saldo se revirtió." });
      load();
      onChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={source !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {source ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>{source.name === "daily" ? "Diario" : "Ahorros"}</DialogTitle>
                <a
                  href={`/api/finance/export/csv${query}`}
                  className="inline-flex items-center gap-1.5 text-xs text-text-2 transition-colors hover:text-accent"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </a>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <Stat label="Saldo" value={formatMoney(source.balance)} />

              {/* ── Filtros ─────────────────────────────── */}
              <Card>
                <CardContent className="flex flex-col gap-3 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Segmented
                      size="sm"
                      aria-label="Tipo"
                      value={filters.type}
                      onChange={(type) => setFilters((f) => ({ ...f, type }))}
                      options={[
                        { value: "all", label: "Todo" },
                        { value: "expense", label: "Gastos" },
                        { value: "income", label: "Ingresos" },
                      ]}
                    />
                    <Select
                      value={filters.category}
                      onValueChange={(category) => setFilters((f) => ({ ...f, category }))}
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {FINANCE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            <span className="capitalize">{category}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="wallet-from" className="text-[11px] text-text-3">
                        Desde
                      </Label>
                      <Input
                        id="wallet-from"
                        type="date"
                        value={filters.from}
                        onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                        className="h-8 w-[140px] text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="wallet-to" className="text-[11px] text-text-3">
                        Hasta
                      </Label>
                      <Input
                        id="wallet-to"
                        type="date"
                        value={filters.to}
                        onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                        className="h-8 w-[140px] text-xs"
                      />
                    </div>
                    {hasFilters ? (
                      <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                        <RotateCcw /> Limpiar
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* ── Gráficas ────────────────────────────── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize text-xs">
                      Gastos · {formatMonthLabel(month)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-40 w-full" />
                    ) : (
                      <ExpenseDonut data={summary?.byCategory ?? []} total={summary?.expense ?? 0} />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs">Evolución del saldo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? <Skeleton className="h-40 w-full" /> : <SingleBalanceChart data={series} />}
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* ── Agregar movimiento ──────────────────── */}
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                  Registrar movimiento
                </p>

                <Segmented
                  size="sm"
                  aria-label="Tipo de movimiento"
                  value={addForm.watch("type")}
                  onChange={(v) => addForm.setValue("type", v)}
                  options={[
                    { value: "expense", label: "Gasto" },
                    { value: "income", label: "Ingreso" },
                  ]}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="wallet-amount">Monto</Label>
                    <Input
                      id="wallet-amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="font-mono tabular-nums"
                      {...addForm.register("amount")}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Categoría</Label>
                    <Select
                      value={addForm.watch("category")}
                      onValueChange={(v) => addForm.setValue("category", v as AddValues["category"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="wallet-date">Fecha</Label>
                    <Input id="wallet-date" type="date" {...addForm.register("date")} />
                  </div>
                </div>

                <Input placeholder="Notas (opcional)" {...addForm.register("notes")} />

                {addForm.formState.errors.amount ? (
                  <p className="text-xs text-danger">{addForm.formState.errors.amount.message}</p>
                ) : null}

                <Button type="submit" disabled={addForm.formState.isSubmitting} className="w-full">
                  {addForm.formState.isSubmitting ? "Guardando…" : "Registrar"}
                </Button>
              </form>

              <Separator />

              {/* ── Lista ───────────────────────────────── */}
              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title={hasFilters ? "Sin resultados" : "Aún no hay movimientos"}
                  description={
                    hasFilters ? "Prueba a ajustar los filtros." : "Registra un gasto o ingreso aquí."
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {transactions.map((transaction) => (
                    <li key={transaction.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className="capitalize">{transaction.category}</Badge>
                          <span className="text-[11px] text-text-3">
                            {formatDateLabel(transaction.date)}
                          </span>
                        </div>
                        {transaction.notes ? (
                          <p className="truncate text-xs text-text-2">{transaction.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={cn(
                            "font-mono text-sm tabular-nums",
                            transaction.type === "income" ? "text-success" : "text-text"
                          )}
                        >
                          {signedMoney(transaction.type, transaction.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Eliminar transacción"
                          disabled={deletingId === transaction.id}
                          onClick={() => handleDelete(transaction)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DialogBody>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
