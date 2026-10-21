import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { prisma } from "@/lib/db";

/** GET /api/nutrition/products — lista de compras del recetario con precios. */
export const GET = withAuth(async () => {
  const products = await prisma.nutritionProduct.findMany({ orderBy: { id: "asc" } });
  return ok(products);
});
