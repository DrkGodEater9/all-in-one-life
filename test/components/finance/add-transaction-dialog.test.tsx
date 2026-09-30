import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AddTransactionDialog } from "@/components/modules/finance/add-transaction-dialog";
import { toDateKey } from "@/lib/utils";
import type { Balance } from "@/components/modules/finance/types";

const apiPost = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: (...args: unknown[]) => apiPost(...args), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  qs: () => "",
  ApiClientError: class ApiClientError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const BALANCE: Balance = {
  daily: 1000,
  savings: 5000,
  total: 6000,
  sources: [
    { id: 1, name: "daily", balance: 1000 },
    { id: 2, name: "savings", balance: 5000 },
  ],
};

describe("AddTransactionDialog", () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it("envía el cuerpo correcto al guardar (tipo, monto numérico, categoría, fuente y fecha)", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValue({ id: 1 });
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AddTransactionDialog
        open
        onOpenChange={onOpenChange}
        balance={BALANCE}
        onCreated={onCreated}
      />
    );

    await user.type(screen.getByLabelText("Monto"), "45.5");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledWith("/finance/transactions", {
      type: "expense",
      amount: 45.5,
      category: "alimentación",
      sourceId: 1, // la fuente "daily" es la de por defecto
      date: toDateKey(),
      notes: null,
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it("cambia a ingreso y a la fuente de ahorros mediante los segmentados", async () => {
    const user = userEvent.setup();
    apiPost.mockResolvedValue({ id: 2 });

    render(
      <AddTransactionDialog
        open
        onOpenChange={vi.fn()}
        balance={BALANCE}
        onCreated={vi.fn()}
      />
    );

    await user.click(screen.getByRole("radio", { name: "Ingreso" }));
    await user.click(screen.getByRole("radio", { name: "Ahorros" }));
    await user.type(screen.getByLabelText("Monto"), "100");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(apiPost).toHaveBeenCalledWith(
      "/finance/transactions",
      expect.objectContaining({ type: "income", sourceId: 2, amount: 100 })
    );
  });

  it("valida: no envía nada y muestra el error si el monto está vacío", async () => {
    const user = userEvent.setup();

    render(
      <AddTransactionDialog
        open
        onOpenChange={vi.fn()}
        balance={BALANCE}
        onCreated={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Indica el monto")).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("valida: rechaza un monto de 0 o negativo", async () => {
    const user = userEvent.setup();

    render(
      <AddTransactionDialog
        open
        onOpenChange={vi.fn()}
        balance={BALANCE}
        onCreated={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Monto"), "0");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("El monto debe ser mayor que cero")).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });
});
