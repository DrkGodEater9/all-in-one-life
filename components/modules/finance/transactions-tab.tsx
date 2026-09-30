"use client";

import * as React from "react";
import { Download, Receipt, RotateCcw, Trash2 } from "lucide-react";
import { api, ApiClientError, qs } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
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
  sourceLabel,
} from "./finance-utils";
import { BalanceChart, buildBalanceSeries } from "./balance-chart";
import { ExpenseDonut } from "./expense-donut";
import type {
  Balance,
  MonthlySummary,
  Transaction,
  TransactionFiltersState,
} from "./types";

const EMPTY_FILTERS: TransactionFiltersState = {
  type: "all",
  category: "all",
  sourceId: "all",
  from: "",
  to: "",
};

export interface TransactionsTabProps {
  balance: Balance | null;
  reloadKey: number;
  onChanged: () => void;
}

export function TransactionsTab({ balance, reloadKey, onChanged }: TransactionsTabProps) {
  const [filters, setFilters] = React.useState<TransactionFiltersState>(EMPTY_FILTERS);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [history, setHistory] = React.useState<Transaction[]>([]);
  const [summary, setSummary] = React.useState<MonthlySummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const month = currentMonthKey();

  const query = qs({
    type: filters.type === "all" ? undefined : filters.type,
    category: filters.category === "all" ? undefined : filters.category,
    sourceId: filters.sourceId === "all" ? undefined : filters.sourceId,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get<Transaction[]>(`/finance/transactions${query}`),
      api.get<MonthlySummary>(`/finance/summary/monthly${qs({ month })}`),
      api.get<Transaction[]>(
        `/finance/transactions${qs({ from: dateKeyMonthsAgo(6) })}`
      ),
    ])
      .then(([list, monthly, recent]) => {
        if (cancelled) return;
        setTransactions(list);
        setSummary(monthly);
        setHistory(recent);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "No se pudieron cargar las transacciones",
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
  }, [query, month, reloadKey]);

  const series = React.useMemo(
    () => (balance ? buildBalanceSeries(history, balance) : []),
    [history, balance]
  );

  const hasFilters =
    filters.type !== "all" ||
    filters.category !== "all" ||
    filters.sourceId !== "all" ||
    filters.from !== "" ||
    filters.to !== "";

  async function handleDelete(transaction: Transaction) {
    setDeletingId(transaction.id);
    try {
      await api.delete(`/finance/transactions/${transaction.id}`);
      toast({ title: "Transacción eliminada", description: "El saldo se revirtió." });
      onChanged();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description:
          error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Filtros inline ─────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
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

            <Segmented
              size="sm"
              aria-label="Fuente"
              value={filters.sourceId}
              onChange={(sourceId) => setFilters((f) => ({ ...f, sourceId }))}
              options={[
                { value: "all", label: "Ambas" },
                ...(balance?.sources ?? []).map((s) => ({
                  value: String(s.id),
                  label: sourceLabel(s.name),
                })),
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
              <Label htmlFor="filter-from" className="text-[11px] text-text-3">
                Desde
              </Label>
              <Input
                id="filter-from"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                className="h-8 w-[150px] text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-to" className="text-[11px] text-text-3">
                Hasta
              </Label>
              <Input
                id="filter-to"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                className="h-8 w-[150px] text-xs"
              />
            </div>

            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                <RotateCcw /> Limpiar
              </Button>
            ) : null}

            <Button variant="outline" size="sm" asChild className="ml-auto">
              <a href={`/api/finance/export/csv${query}`} download>
                <Download /> CSV
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Gráficas ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">
              Gastos por categoría · {formatMonthLabel(month)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ExpenseDonut
                data={summary?.byCategory ?? []}
                total={summary?.expense ?? 0}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolución del saldo</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 w-full" /> : <BalanceChart data={series} />}
          </CardContent>
        </Card>
      </div>

      {/* ── Lista cronológica ──────────────────────── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Movimientos</CardTitle>
          {!loading && transactions.length > 0 ? (
            <span className="font-mono text-xs tabular-nums text-text-3">
              {transactions.length}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={hasFilters ? "Sin resultados" : "Aún no hay movimientos"}
              description={
                hasFilters
                  ? "Prueba a ajustar los filtros."
                  : "Usa el botón + para registrar tu primer gasto o ingreso."
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge className="capitalize">{transaction.category}</Badge>
                      <Badge variant="neutral">
                        {sourceLabel(transaction.source.name)}
                      </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}
