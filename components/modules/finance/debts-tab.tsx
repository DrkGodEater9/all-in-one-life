"use client";

import * as React from "react";
import { ChevronDown, HandCoins } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { cn, formatMoney } from "@/lib/utils";
import {
  Badge,
  Card,
  CardContent,
  EmptyState,
  Progress,
  Skeleton,
  toast,
} from "@/components/ui";
import { debtProgress, formatDateLabel, pendingOf, sourceLabel } from "./finance-utils";
import { DebtDetailDialog } from "./debt-detail-dialog";
import type { Debt } from "./types";

export interface DebtsTabProps {
  reloadKey: number;
  onChanged: () => void;
}

interface DebtSectionProps {
  title: string;
  debts: Debt[];
  total: number;
  open: boolean;
  onToggle: () => void;
  onSelect: (debt: Debt) => void;
  emptyText: string;
  tone: "success" | "danger";
}

function DebtSection({
  title,
  debts,
  total,
  open,
  onToggle,
  onSelect,
  emptyText,
  tone,
}: DebtSectionProps) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-3 transition-transform duration-150",
              open ? "" : "-rotate-90"
            )}
          />
          <span className="text-sm font-medium text-text">{title}</span>
          <span className="font-mono text-[11px] tabular-nums text-text-3">
            {debts.length}
          </span>
        </span>
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            tone === "success" ? "text-success" : "text-danger"
          )}
        >
          {formatMoney(total)}
        </span>
      </button>

      {open ? (
        <CardContent className="border-t border-border pt-0">
          {debts.length === 0 ? (
            <EmptyState icon={HandCoins} title={emptyText} />
          ) : (
            <ul className="divide-y divide-border">
              {debts.map((debt) => {
                const pending = pendingOf(debt);
                const progress = debtProgress(debt);
                return (
                  <li key={debt.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(debt)}
                      className="w-full space-y-2 py-3 text-left transition-colors hover:bg-surface-2/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-text">{debt.person}</p>
                          <p className="truncate text-xs text-text-2">{debt.reason}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm tabular-nums text-text">
                            {formatMoney(pending)}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-text-3">
                            pendiente
                          </p>
                        </div>
                      </div>

                      <Progress
                        value={progress}
                        indicatorClassName={debt.isSettled ? "bg-success" : undefined}
                      />

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] tabular-nums text-text-3">
                          {formatMoney(debt.amountPaid)} / {formatMoney(debt.amount)}
                        </span>
                        <Badge variant="neutral">{sourceLabel(debt.source.name)}</Badge>
                        <span className="text-[11px] text-text-3">
                          {formatDateLabel(debt.date)}
                        </span>
                        {debt.isSettled ? <Badge variant="success">Saldada</Badge> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function DebtsTab({ reloadKey, onChanged }: DebtsTabProps) {
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Debt | null>(null);
  const [openSections, setOpenSections] = React.useState({
    they_owe_me: true,
    i_owe: true,
  });

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get<Debt[]>("/finance/debts")
      .then((data) => {
        if (!cancelled) setDebts(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "No se pudieron cargar las deudas",
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
  }, [reloadKey]);

  const theyOweMe = debts.filter((d) => d.direction === "they_owe_me");
  const iOwe = debts.filter((d) => d.direction === "i_owe");
  const sumPending = (list: Debt[]) =>
    Math.round(
      list.filter((d) => !d.isSettled).reduce((acc, d) => acc + pendingOf(d), 0) * 100
    ) / 100;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <EmptyState
        icon={HandCoins}
        title="Aún no hay deudas registradas"
        description="Usa el botón + para registrar algo que debes o que te deben."
      />
    );
  }

  return (
    <div className="space-y-3">
      <DebtSection
        title="Me deben"
        tone="success"
        debts={theyOweMe}
        total={sumPending(theyOweMe)}
        open={openSections.they_owe_me}
        onToggle={() =>
          setOpenSections((s) => ({ ...s, they_owe_me: !s.they_owe_me }))
        }
        onSelect={setSelected}
        emptyText="Nadie te debe nada"
      />

      <DebtSection
        title="Debo"
        tone="danger"
        debts={iOwe}
        total={sumPending(iOwe)}
        open={openSections.i_owe}
        onToggle={() => setOpenSections((s) => ({ ...s, i_owe: !s.i_owe }))}
        onSelect={setSelected}
        emptyText="No debes nada"
      />

      <DebtDetailDialog
        debt={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onPaid={() => {
          setSelected(null);
          onChanged();
        }}
      />
    </div>
  );
}
