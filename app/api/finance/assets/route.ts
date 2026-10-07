import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { created, ok } from "@/lib/http";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  title: z.string().trim().min(1, "Indica un título").max(160),
  quantity: z
    .number({ invalid_type_error: "La cantidad debe ser un número" })
    .finite()
    .positive("La cantidad debe ser mayor que cero")
    .max(99_999_999, "La cantidad es demasiado grande"),
  unit: z.string().trim().max(32).optional().nullable(),
  priceEach: z
    .number({ invalid_type_error: "El precio debe ser un número" })
    .finite()
    .nonnegative("El precio no puede ser negativo")
    .max(9_999_999_999, "El precio es demasiado grande")
    .optional()
    .nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

/** GET /api/finance/assets */
export const GET = withAuth(async () => {
  const assets = await prisma.financeAsset.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return ok(assets);
});

/** POST /api/finance/assets */
export const POST = withAuth(async ({ req }) => {
  const data = createSchema.parse(await req.json());

  const asset = await prisma.financeAsset.create({
    data: {
      title: data.title,
      quantity: data.quantity,
      unit: data.unit?.trim() ? data.unit.trim() : null,
      priceEach: data.priceEach ?? null,
      notes: data.notes?.trim() ? data.notes.trim() : null,
    },
  });

  return created(asset);
});
