import { z } from "zod";
import type { JobApplication } from "@prisma/client";
import { dbDateKey } from "@/lib/utils";
import {
  applicationStatusSchema,
  dateKeySchema,
  optionalText,
  requiredText,
  urlSchema,
} from "../_lib";

export const applicationBodySchema = z.object({
  company: requiredText("La empresa"),
  position: requiredText("El cargo"),
  url: z.union([urlSchema, z.literal("")]).nullable().optional(),
  source: optionalText(80).nullable().optional(),
  status: applicationStatusSchema.optional(),
  appliedAt: dateKeySchema.optional(),
  salary: optionalText(80).nullable().optional(),
  notes: optionalText(5000).nullable().optional(),
});

/** `appliedAt` viaja como "YYYY-MM-DD" (columna @db.Date, leída en UTC). */
export function toApplicationDTO(row: JobApplication) {
  const { userId: _userId, ...rest } = row;
  return { ...rest, appliedAt: dbDateKey(row.appliedAt) };
}
