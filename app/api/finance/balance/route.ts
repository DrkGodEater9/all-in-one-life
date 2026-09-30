import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { ensureSources, money, num } from "../_lib";

/** GET /api/finance/balance → { daily, savings, total } */
export const GET = withAuth(async () => {
  const sources = await ensureSources();
  const daily = num(sources.daily.balance);
  const savings = num(sources.savings.balance);

  return ok({
    daily,
    savings,
    total: money(daily + savings),
    sources: [
      { id: sources.daily.id, name: "daily", balance: daily },
      { id: sources.savings.id, name: "savings", balance: savings },
    ],
  });
});
