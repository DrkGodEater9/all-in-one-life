import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceClient } from "@/components/modules/finance/finance-client";

export const metadata: Metadata = {
  title: "Finanzas",
  description: "Saldos, transacciones, deudas y activos.",
};

export default function FinancePage() {
  return (
    <>
      <PageHeader
        title="Finanzas"
        description="Saldos, transacciones, deudas y activos."
      />
      <FinanceClient />
    </>
  );
}
