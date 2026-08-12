import { z } from "zod";

export const createOrderSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  orderType: z.enum(["FABRICATION", "WHOLE_PIECES"]).default("FABRICATION"),
  description: z.string().optional(),
  orderDescription: z.string().optional(),
  totalPieces: z.coerce.number().int().positive("Total pieces must be positive"),
  rate: z.coerce.number().min(0, "Rate must be non-negative").default(0),
  deadline: z.string().optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]).optional().nullable(),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID"]).default("PENDING"),
  advanceAmount: z.coerce.number().min(0).default(0),
  clothTypeIds: z.array(z.string()).default([]),
  fabricTypeIds: z.array(z.string()).default([]),
  fabricColors: z.record(z.string(), z.string()).default({}),
  patternId: z.string().optional().nullable(),
  newPatternName: z.string().optional(),
  newPatternDescription: z.string().optional(),
  imageUrls: z.array(z.string()).default([]),
  extraDependencies: z.array(z.object({
    extraDependencyId: z.string(),
    quantity: z.coerce.number().min(0).default(1),
    price: z.coerce.number().min(0).default(0),
  })).default([]),
});

export const updateOrderSchema = z.object({
  id: z.string(),
  clientId: z.string().min(1, "Client is required"),
  orderType: z.enum(["FABRICATION", "WHOLE_PIECES"]).default("FABRICATION"),
  description: z.string().optional(),
  orderDescription: z.string().optional(),
  totalPieces: z.coerce.number().int().positive("Total pieces must be positive"),
  rate: z.coerce.number().min(0, "Rate must be non-negative").default(0),
  deadline: z.string().optional(),
  status: z.enum([
    "ORDER_PLACED",
    "CUTTING_IN_PROGRESS",
    "CUTTING_DONE",
    "STITCHING_IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "DELIVERED",
  ]),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]).optional().nullable(),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID"]).default("PENDING"),
  advanceAmount: z.coerce.number().min(0).default(0),
  clothTypeIds: z.array(z.string()).default([]),
  fabricTypeIds: z.array(z.string()).default([]),
  fabricColors: z.record(z.string(), z.string()).default({}),
  patternId: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).default([]),
  extraDependencies: z.array(z.object({
    extraDependencyId: z.string(),
    quantity: z.coerce.number().min(0).default(1),
    price: z.coerce.number().min(0).default(0),
  })).default([]),
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

