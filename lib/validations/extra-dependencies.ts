import { z } from "zod";

export const createExtraDependencySchema = z.object({
  name: z.string().min(1, "Name is required"),
  defaultPrice: z.coerce.number().min(0, "Price must be non-negative").default(0),
  description: z.string().optional(),
});

export const updateExtraDependencySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  defaultPrice: z.coerce.number().min(0, "Price must be non-negative").default(0),
  description: z.string().optional(),
});

export type CreateExtraDependencyInput = z.infer<typeof createExtraDependencySchema>;
export type UpdateExtraDependencyInput = z.infer<typeof updateExtraDependencySchema>;
