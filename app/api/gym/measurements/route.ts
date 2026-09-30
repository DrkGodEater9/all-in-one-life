import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { ok, created } from "@/lib/http";
import { prisma } from "@/lib/db";
import { parseDateKey, toDateKey } from "@/lib/utils";
import { dateKeySchema, dbDateKey, decToNumber, measurementBodySchema } from "@/app/api/gym/_lib";

const querySchema = z.object({
  from: dateKeySchema.optional(),
  to: dateKeySchema.optional(),
  limit: z.coerce.number().int().positive().max(365).default(120),
});

type MeasurementRow = {
  id: number;
  date: Date;
  chestCm: unknown;
  waistCm: unknown;
  hipsCm: unknown;
  armsCm: unknown;
  thighsCm: unknown;
  notes: string | null;
};

function toDTO(row: MeasurementRow) {
  const dec = (v: unknown) => decToNumber(v as never);
  return {
    id: row.id,
    date: dbDateKey(row.date),
    chestCm: dec(row.chestCm),
    waistCm: dec(row.waistCm),
    hipsCm: dec(row.hipsCm),
    armsCm: dec(row.armsCm),
    thighsCm: dec(row.thighsCm),
    notes: row.notes,
  };
}

export const GET = withAuth(async ({ searchParams }) => {
  const query = querySchema.parse(Object.fromEntries(searchParams));

  const measurements = await prisma.gymMeasurement.findMany({
    where: {
      date: {
        gte: query.from ? parseDateKey(query.from) : undefined,
        lte: query.to ? parseDateKey(query.to) : undefined,
      },
    },
    orderBy: { date: "desc" },
    take: query.limit,
  });

  // El cliente grafica cronológicamente.
  return ok(measurements.map(toDTO).reverse());
});

export const POST = withAuth(async ({ req }) => {
  const data = measurementBodySchema.parse(await req.json());

  const measurement = await prisma.gymMeasurement.create({
    data: {
      date: parseDateKey(data.date ?? toDateKey()),
      chestCm: data.chestCm ?? null,
      waistCm: data.waistCm ?? null,
      hipsCm: data.hipsCm ?? null,
      armsCm: data.armsCm ?? null,
      thighsCm: data.thighsCm ?? null,
      notes: data.notes ?? null,
    },
  });

  return created(toDTO(measurement));
});
