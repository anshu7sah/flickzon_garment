import { z } from "zod";

export const createMaterialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["FABRIC", "ZIPPER", "DHAGA", "BUTTON", "ELASTIC", "LACE", "OTHER"]),
  unit: z.enum(["KG", "METER", "PIECE", "ROLL", "DOZEN"]),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  colors: z.array(z.string()).default([]),
});

export const updateMaterialSchema = createMaterialSchema.extend({
  id: z.string(),
});

export const createClothTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const createFabricTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const addOrderMaterialSchema = z.object({
  orderId: z.string().min(1, "Order is required"),
  materialId: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  colorSelected: z.string().optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateClothTypeInput = z.infer<typeof createClothTypeSchema>;
export type CreateFabricTypeInput = z.infer<typeof createFabricTypeSchema>;
export type AddOrderMaterialInput = z.infer<typeof addOrderMaterialSchema>;
