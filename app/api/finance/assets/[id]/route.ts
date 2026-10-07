import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { notFound, ok } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseId } from "../../_lib";

const updateSchema = z.object({
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

/** PUT /api/finance/assets/[id] */
export const PUT = withAuth<{ id: string }>(async ({ req, params }) => {
  const id = parseId(params.id);
  const data = updateSchema.parse(await req.json());

  const existing = await prisma.financeAsset.findUnique({ where: { id } });
  if (!existing) throw notFound("Activo no encontrado");

  const asset = await prisma.financeAsset.update({
    where: { id },
    data: {
      title: data.title,
      quantity: data.quantity,
      unit: data.unit?.trim() ? data.unit.trim() : null,
      priceEach: data.priceEach ?? null,
      notes: data.notes?.trim() ? data.notes.trim() : null,
    },
  });

  return ok(asset);
});

/** DELETE /api/finance/assets/[id] */
export const DELETE = withAuth<{ id: string }>(async ({ params }) => {
  const id = parseId(params.id);

  const existing = await prisma.financeAsset.findUnique({ where: { id } });
  if (!existing) throw notFound("Activo no encontrado");

  await prisma.financeAsset.delete({ where: { id } });
  return ok({ success: true });
});
