import { z, call, qs, clean, today, download, DATE, ID } from "../lib.mjs";

const SOURCE = z.enum(["daily", "savings"]).describe("daily = diario, savings = ahorros");
const CATEGORY = z.enum([
  "alimentación",
  "transporte",
  "salud",
  "entretenimiento",
  "suscripciones",
  "ropa",
  "educación",
  "otro",
]);
const AMOUNT = z.number().positive().describe("Monto en pesos (COP), sin separadores");

/** daily/savings → id de la fuente (la API trabaja con ids). */
async function sourceId(name) {
  const balance = await call("GET", "/finance/balance");
  const found = balance.sources.find((s) => s.name === name);
  if (!found) throw new Error(`No existe la fuente ${name}`);
  return found.id;
}

export function register(tool) {
  tool(
    "get_balance",
    "Finanzas: saldo de la fuente diaria, los ahorros y el total.",
    {},
    () => call("GET", "/finance/balance")
  );

  tool(
    "list_transactions",
    "Finanzas: lista transacciones (gastos e ingresos), con filtros opcionales.",
    {
      type: z.enum(["expense", "income"]).optional(),
      category: z.string().optional(),
      source: SOURCE.optional(),
      from: DATE.optional(),
      to: DATE.optional(),
    },
    async ({ source, ...rest }) =>
      call("GET", `/finance/transactions${qs({ ...rest, sourceId: source ? await sourceId(source) : undefined })}`)
  );

  tool(
    "add_transaction",
    "Finanzas: registra un gasto o ingreso y ajusta el saldo de la fuente. Fecha por defecto: hoy.",
    {
      type: z.enum(["expense", "income"]),
      amount: AMOUNT,
      category: CATEGORY,
      source: SOURCE,
      date: DATE.optional(),
      notes: z.string().optional(),
    },
    async ({ source, date, ...rest }) =>
      call("POST", "/finance/transactions", { ...rest, sourceId: await sourceId(source), date: date ?? today() })
  );

  tool(
    "delete_transaction",
    "Finanzas: elimina una transacción y revierte su efecto en el saldo. Irreversible: confírmalo antes.",
    { id: ID },
    ({ id }) => call("DELETE", `/finance/transactions/${id}`)
  );

  tool(
    "monthly_summary",
    "Finanzas: resumen de un mes (ingresos, gastos, por categoría). Por defecto el mes actual.",
    { month: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("YYYY-MM"), source: SOURCE.optional() },
    async ({ month, source }) =>
      call("GET", `/finance/summary/monthly${qs({ month, sourceId: source ? await sourceId(source) : undefined })}`)
  );

  tool(
    "export_transactions_xlsx",
    "Finanzas: descarga un Excel con las transacciones (mismos filtros que list_transactions) a la carpeta de Descargas del usuario y devuelve la ruta del archivo.",
    {
      type: z.enum(["expense", "income"]).optional(),
      category: z.string().optional(),
      source: SOURCE.optional(),
      from: DATE.optional(),
      to: DATE.optional(),
    },
    async ({ source, ...rest }) =>
      download(
        `/finance/export/xlsx${qs({ ...rest, sourceId: source ? await sourceId(source) : undefined })}`,
        "transacciones.xlsx"
      )
  );

  // ── Deudas ───────────────────────────────────────────────────────────────
  tool(
    "list_debts",
    "Finanzas: lista deudas. i_owe = yo debo, they_owe_me = me deben.",
    { direction: z.enum(["i_owe", "they_owe_me"]).optional(), isSettled: z.boolean().optional() },
    (args) => call("GET", `/finance/debts${qs(args)}`)
  );

  tool(
    "add_debt",
    "Finanzas: registra una deuda. No mueve el saldo: el dinero se mueve al registrar pagos. person solo admite letras.",
    {
      direction: z.enum(["i_owe", "they_owe_me"]),
      person: z.string(),
      reason: z.string(),
      amount: AMOUNT,
      source: SOURCE,
      date: DATE.optional(),
    },
    async ({ source, date, ...rest }) =>
      call("POST", "/finance/debts", { ...rest, sourceId: await sourceId(source), date: date ?? today() })
  );

  tool(
    "pay_debt",
    "Finanzas: registra un pago a una deuda (no puede exceder lo pendiente).",
    { id: ID, amount: AMOUNT, date: DATE.optional() },
    ({ id, amount, date }) => call("POST", `/finance/debts/${id}/pay`, { amount, date: date ?? today() })
  );

  tool(
    "list_debt_payments",
    "Finanzas: historial de pagos de una deuda.",
    { id: ID },
    ({ id }) => call("GET", `/finance/debts/${id}/payments`)
  );

  // ── Activos ──────────────────────────────────────────────────────────────
  tool("list_assets", "Finanzas: lista los activos/pertenencias registrados.", {}, () =>
    call("GET", "/finance/assets")
  );

  const assetShape = {
    title: z.string(),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    priceEach: z.number().min(0).optional().describe("Precio por unidad en COP"),
    notes: z.string().optional(),
  };

  tool("add_asset", "Finanzas: agrega un activo.", assetShape, (args) => call("POST", "/finance/assets", args));

  tool(
    "update_asset",
    "Finanzas: reemplaza los datos de un activo (envía todos los campos).",
    { id: ID, ...assetShape },
    ({ id, ...body }) => call("PUT", `/finance/assets/${id}`, body)
  );

  tool("delete_asset", "Finanzas: elimina un activo. Irreversible: confírmalo antes.", { id: ID }, ({ id }) =>
    call("DELETE", `/finance/assets/${id}`)
  );

  // ── Líneas de crédito ────────────────────────────────────────────────────
  tool("list_credit_lines", "Finanzas: lista las líneas de crédito con usado, disponible y lo que se debe.", {}, () =>
    call("GET", "/finance/credit-lines")
  );

  tool(
    "get_credit_line",
    "Finanzas: detalle de una línea de crédito con sus movimientos.",
    { id: ID },
    ({ id }) => call("GET", `/finance/credit-lines/${id}`)
  );

  tool(
    "add_credit_line",
    "Finanzas: crea una línea de crédito. creditLimit = cupo; totalDebt = total a pagar (opcionales).",
    { name: z.string(), creditLimit: z.number().positive().optional(), totalDebt: z.number().min(0).optional() },
    (args) => call("POST", "/finance/credit-lines", args)
  );

  tool(
    "update_credit_line",
    "Finanzas: edita una línea de crédito; solo se cambian los campos enviados.",
    {
      id: ID,
      name: z.string(),
      creditLimit: z.number().positive().nullable().optional(),
      totalDebt: z.number().min(0).nullable().optional(),
    },
    ({ id, ...body }) => call("PUT", `/finance/credit-lines/${id}`, clean(body))
  );

  tool(
    "delete_credit_line",
    "Finanzas: elimina una línea de crédito y todos sus movimientos. Irreversible: confírmalo antes.",
    { id: ID },
    ({ id }) => call("DELETE", `/finance/credit-lines/${id}`)
  );

  tool(
    "add_credit_movement",
    "Finanzas: registra un retiro (withdrawal) o un pago (payment) en una línea de crédito.",
    {
      creditLineId: ID,
      type: z.enum(["withdrawal", "payment"]),
      amount: AMOUNT,
      date: DATE.optional(),
      notes: z.string().optional(),
    },
    ({ creditLineId, date, ...rest }) =>
      call("POST", `/finance/credit-lines/${creditLineId}/movements`, { ...rest, date: date ?? today() })
  );

  tool(
    "export_credit_line_xlsx",
    "Finanzas: descarga un Excel con los movimientos de una línea de crédito a la carpeta de Descargas y devuelve la ruta.",
    { id: ID },
    ({ id }) => download(`/finance/credit-lines/${id}/export`, `credito-${id}.xlsx`)
  );

  tool(
    "delete_credit_movement",
    "Finanzas: elimina un movimiento de una línea de crédito.",
    { creditLineId: ID, movementId: ID },
    ({ creditLineId, movementId }) =>
      call("DELETE", `/finance/credit-lines/${creditLineId}/movements/${movementId}`)
  );
}
