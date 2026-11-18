import { z } from "zod";
import { APPLICATION_STATUSES, PORTAL_STATUSES } from "@/components/modules/jobs/constants";

export { parseId, emptyToNull, urlSchema } from "../projects/_lib";

export const portalStatusSchema = z.enum(PORTAL_STATUSES);
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido, se espera YYYY-MM-DD");

export const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} es obligatorio`).max(max);

export const optionalText = (max: number) => z.string().trim().max(max);
