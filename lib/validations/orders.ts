import { z } from "zod";

export const createOrderSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  description: z.string().optional(),
  totalPieces: z.coerce.number().int().positive("Total pieces must be positive"),
  deadline: z.string().optional(),
});

export const updateOrderSchema = createOrderSchema.extend({
  id: z.string(),
  status: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export const assignWorkerSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  workerId: z.string().min(1, "Worker is required"),
  assignedPieces: z.coerce
    .number()
    .int()
    .positive("Assigned pieces must be positive"),
});

export const logPiecesSchema = z.object({
  orderAssignmentId: z.string().min(1, "Assignment is required"),
  pieces: z.coerce.number().int().positive("Pieces must be positive"),
  note: z.string().optional(),
});

export const approvePieceLogSchema = z.object({
  pieceLogId: z.string().min(1, "Piece log is required"),
  status: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AssignWorkerInput = z.infer<typeof assignWorkerSchema>;
export type LogPiecesInput = z.infer<typeof logPiecesSchema>;
export type ApprovePieceLogInput = z.infer<typeof approvePieceLogSchema>;
