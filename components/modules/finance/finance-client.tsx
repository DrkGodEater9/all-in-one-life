"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import {
  Button,
  Skeleton,
  Stat,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@/components/ui";
import { TransactionsTab } from "./transactions-tab";
import { DebtsTab } from "./debts-tab";
import { AssetsTab } from "./assets-tab";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { AddDebtDialog } from "./add-debt-dialog";
import { AssetDialog } from "./asset-dialog";
import type { Balance } from "./types";

type TabValue = "transactions" | "debts" | "assets";

const ADD_LABEL: Record<TabValue, string> = {
  transactions: "Nueva transacción",
  debts: "Nueva deuda",
  assets: "Nuevo activo",
};

export function FinanceClient() {
  const [tab, setTab] = React.useState<TabValue>("transactions");
  const [balance, setBalance] = React.useState<Balance | null>(null);
  const [loadingBalance, setLoadingBalance] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [txDialog, setTxDialog] = React.useState(false);
  const [debtDialog, setDebtDialog] = React.useState(false);
  const [assetDialog, setAssetDialog] = React.useState(false);

  const reload = React.useCallback(() => setReloadKey((k) => k + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingBalance(true);

    api
      .get<Balance>("/finance/balance")
      .then((data) => {
        if (!cancelled) setBalance(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "No se pudo cargar el saldo",
          description:
            error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingBalance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function openAddForActiveTab() {
    if (tab === "transactions") setTxDialog(true);
    else if (tab === "debts") setDebtDialog(true);
    else setAssetDialog(true);
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* ── Header: saldos ─────────────────────────── */}
      <header className="space-y-3 border-b border-border pb-5">
        {loadingBalance && !balance ? (
          <div className="flex gap-10">
            <Skeleton className="h-14 w-32" />
            <Skeleton className="h-14 w-32" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <Stat
                label="Diario"
                value={formatMoney(balance?.daily ?? 0)}
              />
              <Stat
                label="Ahorros"
                value={formatMoney(balance?.savings ?? 0)}
              />
            </div>
            <p className="text-sm text-text-2">
              Total combinado{" "}
              <span className="font-mono tabular-nums text-text-2">
                {formatMoney(balance?.total ?? 0)}
              </span>
            </p>
          </>
        )}
      </header>

      {/* ── Tabs ───────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
        <TabsList>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="debts">Deudas</TabsTrigger>
          <TabsTrigger value="assets">Activos</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <TransactionsTab
            balance={balance}
            reloadKey={reloadKey}
            onChanged={reload}
          />
        </TabsContent>

        <TabsContent value="debts">
          <DebtsTab reloadKey={reloadKey} onChanged={reload} />
        </TabsContent>

        <TabsContent value="assets">
          <AssetsTab reloadKey={reloadKey} onChanged={reload} />
        </TabsContent>
      </Tabs>

      {/* ── FAB contextual ─────────────────────────── */}
      <Button
        size="icon"
        aria-label={ADD_LABEL[tab]}
        title={ADD_LABEL[tab]}
        onClick={openAddForActiveTab}
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full md:bottom-8 md:right-8"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <AddTransactionDialog
        open={txDialog}
        onOpenChange={setTxDialog}
        balance={balance}
        onCreated={reload}
      />
      <AddDebtDialog
        open={debtDialog}
        onOpenChange={setDebtDialog}
        balance={balance}
        onCreated={reload}
      />
      <AssetDialog
        open={assetDialog}
        onOpenChange={setAssetDialog}
        onSaved={reload}
      />
    </div>
  );
}
