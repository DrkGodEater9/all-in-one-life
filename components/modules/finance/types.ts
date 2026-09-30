/**
 * Formas que devuelve `/api/finance/*`.
 *
 * `ok()` serializa Decimal → number y Date → ISO string, así que aquí
 * los montos son `number` y las fechas `string` ISO.
 */
import type { DebtDirection, TransactionType } from "./constants";

export interface FinanceSource {
  id: number;
  name: string;
  balance: number;
  createdAt: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  category: string;
  sourceId: number;
  date: string;
  notes: string | null;
  createdAt: string;
  source: FinanceSource;
}

export interface Debt {
  id: number;
  direction: DebtDirection;
  person: string;
  reason: string;
  amount: number;
  amountPaid: number;
  sourceId: number;
  date: string;
  isSettled: boolean;
  createdAt: string;
  source: FinanceSource;
  _count: { payments: number };
}

export interface DebtPayment {
  id: number;
  debtId: number;
  amount: number;
  date: string;
  createdAt: string;
}

export interface Asset {
  id: number;
  title: string;
  quantity: number;
  unit: string | null;
  priceEach: number | null;
  notes: string | null;
  createdAt: string;
}

export interface Balance {
  daily: number;
  savings: number;
  total: number;
  sources: Array<{ id: number; name: string; balance: number }>;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlySummary {
  month: string;
  from: string;
  to: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  byCategory: CategoryBreakdown[];
}

export interface CreditMovement {
  id: number;
  creditLineId: number;
  type: "withdrawal" | "payment";
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface CreditLine {
  id: number;
  name: string;
  creditLimit: number | null;
  createdAt: string;
  used: number;
  limit: number | null;
  available: number | null;
}

export interface CreditLineDetail extends CreditLine {
  movements: CreditMovement[];
}

/** Filtros del listado de transacciones (estado local del tab). */
export interface TransactionFiltersState {
  type: TransactionType | "all";
  category: string;
  sourceId: string;
  from: string;
  to: string;
}
