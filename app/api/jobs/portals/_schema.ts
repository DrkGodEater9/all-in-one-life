import { z } from "zod";
import { optionalText, portalStatusSchema, requiredText, urlSchema } from "../_lib";

export const portalBodySchema = z.object({
  name: requiredText("El nombre", 80),
  url: z.union([urlSchema, z.literal("")]).nullable().optional(),
  account: optionalText(200).nullable().optional(),
  status: portalStatusSchema.optional(),
  notes: optionalText(2000).nullable().optional(),
});
