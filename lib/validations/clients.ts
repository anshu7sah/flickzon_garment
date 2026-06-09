import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export const updateClientSchema = createClientSchema.extend({
  id: z.string(),
});

export const createPaymentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  orderId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  method: z.string().optional(),
  note: z.string().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
