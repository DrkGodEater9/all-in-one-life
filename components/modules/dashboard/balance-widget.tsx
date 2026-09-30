"use client";

import * as React from "react";
import { Wallet } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { Stat } from "@/components/ui";
import type { Balance } from "@/components/modules/finance/types";
import { WidgetError, WidgetShell, WidgetSkeleton } from "./widget-shell";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Balance };

/** Widget 1: saldo daily/savings, en Instrument Serif grande lado a lado (regla 4). */
export function BalanceWidget() {
  const [state, setState] = React.useState<State>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    api
      .get<Balance>("/finance/balance")
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof ApiClientError ? error.message : "No se pudo cargar el saldo",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WidgetShell href="/finance" title="Saldo" icon={Wallet}>
      {state.status === "loading" && <WidgetSkeleton />}
      {state.status === "error" && <WidgetError message={state.message} />}
      {state.status === "ready" && (
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Stat
            label="Diario"
            value={formatMoney(state.data.daily)}
            valueClassName="font-serif text-3xl"
          />
          <Stat
            label="Ahorros"
            value={formatMoney(state.data.savings)}
            valueClassName="font-serif text-3xl"
          />
        </div>
      )}
    </WidgetShell>
  );
}
