import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionsTab } from "@/components/modules/finance/transactions-tab";
import type { Transaction, MonthlySummary } from "@/components/modules/finance/types";

const apiGet = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => apiGet(...args), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  qs: () => "",
  ApiClientError: class ApiClientError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const TRANSACTION: Transaction = {
  id: 1,
  type: "expense",
  amount: 50000,
  category: "alimentación",
  sourceId: 1,
  date: "2026-01-15T00:00:00.000Z",
  notes: null,
  createdAt: "2026-01-15T00:00:00.000Z",
  source: { id: 1, name: "daily", balance: 1000, createdAt: "2026-01-01T00:00:00.000Z" },
};

const INCOME: Transaction = {
  ...TRANSACTION,
  id: 2,
  type: "income",
  amount: 200000,
  category: "otro",
};

const SUMMARY: MonthlySummary = {
  month: "2026-01",
  from: "2026-01-01",
  to: "2026-01-31",
  income: 200000,
  expense: 50000,
  net: 150000,
  transactionCount: 2,
  byCategory: [{ category: "alimentación", total: 50000, count: 1, percentage: 100 }],
};

describe("TransactionsTab", () => {
  it("muestra el monto formateado de cada transacción, con signo", async () => {
    apiGet
      .mockResolvedValueOnce([TRANSACTION, INCOME]) // listado filtrado
      .mockResolvedValueOnce(SUMMARY) // resumen mensual
      .mockResolvedValueOnce([TRANSACTION, INCOME]); // histórico para la gráfica

    render(<TransactionsTab balance={null} reloadKey={0} onChanged={vi.fn()} />);

    // Gasto: signo menos (−), sin decimales, separador de miles es punto en es-CO.
    expect(await screen.findByText("−$ 50.000")).toBeInTheDocument();
    // Ingreso: signo más.
    expect(await screen.findByText("+$ 200.000")).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay movimientos", async () => {
    apiGet.mockResolvedValueOnce([]).mockResolvedValueOnce(SUMMARY).mockResolvedValueOnce([]);

    render(<TransactionsTab balance={null} reloadKey={0} onChanged={vi.fn()} />);

    expect(await screen.findByText("Aún no hay movimientos")).toBeInTheDocument();
  });
});
