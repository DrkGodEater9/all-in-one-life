"use client";

import * as React from "react";
import { Plus, Wallet } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import {
  Button,
  Card,
  SectionHeader,
  Skeleton,
  Stat,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@/components/ui";
import { DebtsTab } from "./debts-tab";
import { AssetsTab } from "./assets-tab";
import { CreditLinesTab } from "./credit-lines-tab";
import { AddDebtDialog } from "./add-debt-dialog";
import { AssetDialog } from "./asset-dialog";
import { AddCreditLineDialog } from "./add-credit-line-dialog";
import { WalletDetailDialog, type WalletSource } from "./wallet-detail-dialog";
import type { Balance } from "./types";

type TabValue = "wallets" | "debts" | "assets";

const ADD_LABEL: Record<TabValue, string> = {
  wallets: "Nueva línea de crédito",
  debts: "Nueva deuda",
  assets: "Nuevo activo",
};

/**
 * "Mi dinero" y "Créditos" comparten la misma lógica de interacción, a
 * pedido del usuario: todo lo que antes era la pestaña "Transacciones"
 * (filtros, gráficas, lista, agregar) vive ahora DENTRO del detalle de cada
 * billetera, no mezclado en una sola vista. Aquí solo se listan las
 * tarjetas; el contenido rico vive en WalletDetailDialog / CreditLinesTab.
 */
export function FinanceClient() {
  const [tab, setTab] = React.useState<TabValue>("wallets");
  const [balance, setBalance] = React.useState<Balance | null>(null);
  const [loadingBalance, setLoadingBalance] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [selectedSource, setSelectedSource] = React.useState<WalletSource | null>(null);

  const [debtDialog, setDebtDialog] = React.useState(false);
  const [assetDialog, setAssetDialog] = React.useState(false);
  const [creditLineDialog, setCreditLineDialog] = React.useState(false);

  const reload = React.useCallback(() => setReloadKey((k) => k + 1), []);

  const loadBalance = React.useCallback(() => {
    setLoadingBalance(true);
    return api
      .get<Balance>("/finance/balance")
      .then(setBalance)
      .catch((error: unknown) => {
        toast({
          variant: "destructive",
          title: "No se pudo cargar el saldo",
          description: error instanceof ApiClientError ? error.message : "Inténtalo de nuevo",
        });
      })
      .finally(() => setLoadingBalance(false));
  }, []);

  React.useEffect(() => {
    loadBalance();
  }, [loadBalance, reloadKey]);

  // `selectedSource` es una foto fija tomada al hacer click en la tarjeta.
  // Sin este efecto, registrar una transacción dentro del modal actualizaba
  // la lista de movimientos (que se recarga sola) pero el "Saldo" grande y
  // la gráfica de evolución seguían mostrando el balance de ANTES de esa
  // transacción hasta cerrar y reabrir el modal — `onChanged` sí llama a
  // `loadBalance()`, pero nada volvía a leer ese balance fresco hacia
  // `selectedSource`. Aquí se resincroniza cada vez que `balance` cambia.
  React.useEffect(() => {
    if (!balance || !selectedSource) return;
    const fresh = balance.sources.find((s) => s.id === selectedSource.id);
    if (fresh && fresh.balance !== selectedSource.balance) {
      setSelectedSource(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  function openAddForActiveTab() {
    if (tab === "debts") setDebtDialog(true);
    else if (tab === "assets") setAssetDialog(true);
    else setCreditLineDialog(true);
  }

  const daily = balance?.sources.find((s) => s.name === "daily");
  const savings = balance?.sources.find((s) => s.name === "savings");

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* ── Tabs ───────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
        <TabsList>
          <TabsTrigger value="wallets">Billeteras</TabsTrigger>
          <TabsTrigger value="debts">Deudas</TabsTrigger>
          <TabsTrigger value="assets">Activos</TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="space-y-8">
          <div className="space-y-3">
            <SectionHeader title="Mi dinero" />
            {loadingBalance && !balance ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { source: daily, label: "Diario" },
                  { source: savings, label: "Ahorros" },
                ].map(({ source, label }) => (
                  <Card key={label} className="p-4">
                    <button
                      type="button"
                      disabled={!source}
                      onClick={() => source && setSelectedSource(source)}
                      className="w-full space-y-3 text-left disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-text">{label}</p>
                        <Wallet className="h-4 w-4 shrink-0 text-text-3" />
                      </div>
                      <Stat value={formatMoney(source?.balance ?? 0)} />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <SectionHeader title="Créditos" />
            <CreditLinesTab reloadKey={reloadKey} onChanged={reload} />
          </div>
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
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 h-12 w-12 rounded-full md:bottom-8 md:right-8"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <WalletDetailDialog
        source={selectedSource}
        onOpenChange={(open) => {
          if (!open) setSelectedSource(null);
        }}
        onChanged={() => {
          loadBalance();
          reload();
        }}
      />
      <AddDebtDialog
        open={debtDialog}
        onOpenChange={setDebtDialog}
        balance={balance}
        onCreated={reload}
      />
      <AssetDialog open={assetDialog} onOpenChange={setAssetDialog} onSaved={reload} />
      <AddCreditLineDialog
        open={creditLineDialog}
        onOpenChange={setCreditLineDialog}
        onCreated={reload}
      />
    </div>
  );
}
