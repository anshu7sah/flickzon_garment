import { z } from "zod";

export const createWorkerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  wageType: z.enum(["PIECE_RATE", "DAILY", "MONTHLY"]),
  ratePerPiece: z.coerce.number().optional(),
  dailyRate: z.coerce.number().optional(),
  monthlyRate: z.coerce.number().optional(),
});

export const updateWorkerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  isActive: z.boolean().optional(),
});

export const workerPaymentSchema = z.object({
  workerId: z.string().min(1, "Worker is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  type: z.enum(["SALARY", "ADVANCE", "BONUS", "DEDUCTION"]),
  date: z.string().min(1, "Date is required"),
  note: z.string().optional(),
  status: z.enum(["PENDING", "PAID"]).optional(),
});

export const wageConfigSchema = z.object({
  workerId: z.string().min(1, "Worker is required"),
  wageType: z.enum(["PIECE_RATE", "DAILY", "MONTHLY"]),
  ratePerPiece: z.coerce.number().optional(),
  dailyRate: z.coerce.number().optional(),
  monthlyRate: z.coerce.number().optional(),
});

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
export type WorkerPaymentInput = z.infer<typeof workerPaymentSchema>;
export type WageConfigInput = z.infer<typeof wageConfigSchema>;
