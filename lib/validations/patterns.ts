import { z } from "zod";

export const createPatternSchema = z.object({
  name: z.string().min(1, "Pattern name is required"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Client is required"),
});

export const updatePatternSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Pattern name is required"),
  description: z.string().optional(),
  clientId: z.string().min(1, "Client is required"),
});

export type CreatePatternInput = z.infer<typeof createPatternSchema>;
export type UpdatePatternInput = z.infer<typeof updatePatternSchema>;
