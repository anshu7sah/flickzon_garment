import { z } from "zod";

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.extend({
  id: z.string(),
});

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  orderId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.extend({
  id: z.string(),
});

export type CreateExpenseCategoryInput = z.infer<
  typeof createExpenseCategorySchema
>;
export type UpdateExpenseCategoryInput = z.infer<
  typeof updateExpenseCategorySchema
>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
