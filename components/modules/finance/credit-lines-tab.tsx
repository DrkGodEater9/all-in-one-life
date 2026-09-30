"use client";

import * as React from "react";
import { CreditCard, Download } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { Card, EmptyState, Progress, Skeleton, Stat, toast } from "@/components/ui";
import { creditLineProgress } from "./finance-utils";
import { CreditLineDetailDialog } from "./credit-line-detail-dialog";
import type { CreditLine } from "./types";

export interface CreditLinesTabProps {
  reloadKey: number;
  onChanged: () => void;
}

export function CreditLinesTab({ reloadKey, onChanged }: CreditLinesTabProps) {
  const [lines, setLines] = React.useState<CreditLine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<number | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    api
      .get<CreditLine[]>("/finance/credit-lines")
      .then(setLines)
      .catch((error: unknown) => {
        toast({
          variant: "destructive",
          title: "No se pudieron cargar las líneas de crédito",
          description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Aún no hay líneas de crédito"
        description="Usa el botón + para agregar una y llevar el registro de retiros y pagos."
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {lines.map((line) => {
          const progress = creditLineProgress(line);
          return (
            <Card key={line.id} className="p-4">
              <button
                type="button"
                onClick={() => setSelected(line.id)}
                className="w-full space-y-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-text">{line.name}</p>
                  <CreditCard className="h-4 w-4 shrink-0 text-text-3" />
                </div>

                {line.limit !== null ? (
                  <>
                    <Stat label="Disponible" value={formatMoney(line.available ?? 0)} />
                    <Progress value={progress} />
                    <p className="font-mono text-[11px] tabular-nums text-text-3">
                      {formatMoney(line.used)} usado / {formatMoney(line.limit)} cupo
                    </p>
                  </>
                ) : (
                  <Stat label="Usado" value={formatMoney(line.used)} />
                )}
              </button>

              <a
                href={`/api/finance/credit-lines/${line.id}/export`}
                onClick={(e) => e.stopPropagation()}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-text-2 transition-colors hover:text-accent"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </a>
            </Card>
          );
        })}
      </div>

      <CreditLineDetailDialog
        creditLineId={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onChanged={() => {
          load();
          onChanged();
        }}
      />
    </>
  );
}
