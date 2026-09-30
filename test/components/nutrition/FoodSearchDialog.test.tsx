import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { FoodSearchDialog } from "@/components/modules/nutrition/FoodSearchDialog";
import type { FoodResult } from "@/components/modules/nutrition/types";

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  qs: (o: Record<string, unknown>) => {
    const parts = Object.entries(o)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}=${v}`);
    return parts.length ? `?${parts.join("&")}` : "";
  },
}));

const MANZANA: FoodResult = {
  key: "cache-1",
  source: "cache",
  foodCacheId: 1,
  favoriteId: null,
  offId: "off-1",
  name: "Manzana",
  kcal100g: 52,
  protein100g: 0.3,
  carbs100g: 14,
  fat100g: 0.2,
};

function searchCalls() {
  return apiGet.mock.calls.filter(([url]) => String(url).includes("/nutrition/search"));
}

const sleep = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

describe("FoodSearchDialog", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiGet.mockResolvedValue([]); // por defecto: favoritos vacíos
  });

  it("debouncea la búsqueda 300ms: no dispara una petición por cada tecla", async () => {
    const user = userEvent.setup();

    render(
      <FoodSearchDialog
        open
        onOpenChange={vi.fn()}
        mealType="lunch"
        date="2026-01-01"
        onAdded={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Buscar alimento");
    await user.type(input, "manzana");

    // Justo después de escribir las 7 letras no debería haber disparado ninguna
    // búsqueda todavía: el debounce de 300ms arranca en la última tecla.
    expect(searchCalls()).toHaveLength(0);

    await sleep(400);

    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0][0]).toContain("q=manzana");
  }, 10000);

  it("no busca con menos de 2 caracteres", async () => {
    const user = userEvent.setup();

    render(
      <FoodSearchDialog
        open
        onOpenChange={vi.fn()}
        mealType="lunch"
        date="2026-01-01"
        onAdded={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Buscar alimento"), "a");
    await sleep(400);

    expect(searchCalls()).toHaveLength(0);
    expect(screen.getByText("Escribe al menos 2 letras")).toBeInTheDocument();
  }, 10000);

  it("al seleccionar un alimento y poner los gramos, el preview de macros es correcto", async () => {
    const user = userEvent.setup();
    apiGet.mockImplementation(async (url: string) => {
      if (url.includes("/nutrition/search")) return [MANZANA];
      return []; // favoritos
    });

    render(
      <FoodSearchDialog
        open
        onOpenChange={vi.fn()}
        mealType="lunch"
        date="2026-01-01"
        onAdded={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Buscar alimento"), "manzana");

    const foodButton = await screen.findByText("Manzana", {}, { timeout: 2000 });
    await user.click(foodButton);

    // 100 g por defecto -> el preview es igual a los valores por 100 g.
    expect(await screen.findByText("52")).toBeInTheDocument(); // kcal
    expect(await screen.findByText("14")).toBeInTheDocument(); // carbohidratos

    const amountInput = screen.getByLabelText("Cantidad (g)");
    await user.clear(amountInput);
    await user.type(amountInput, "200");

    // 200 g -> factor 2: kcal 104, carbohidratos 28.
    expect(await screen.findByText("104")).toBeInTheDocument();
    expect(await screen.findByText("28")).toBeInTheDocument();
  }, 10000);
});
