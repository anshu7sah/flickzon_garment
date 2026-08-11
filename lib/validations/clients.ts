import { z } from "zod";

// ── Client Types ──────────────────────────────────────────────────────
export const CLIENT_TYPES = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "RETAILER", label: "Retailer" },
  { value: "BOUTIQUE", label: "Boutique" },
  { value: "WHOLESALER", label: "Wholesaler" },
  { value: "MANUFACTURER", label: "Manufacturer" },
  { value: "EXPORT_CLIENT", label: "Export Client" },
  { value: "OTHER", label: "Other" },
] as const;

export const CLIENT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "BLACKLISTED", label: "Blacklisted" },
] as const;

export const PAYMENT_TERMS = [
  { value: "ADVANCE", label: "Advance" },
  { value: "COD", label: "Cash on Delivery" },
  { value: "7_DAYS", label: "7 Days" },
  { value: "15_DAYS", label: "15 Days" },
  { value: "30_DAYS", label: "30 Days" },
  { value: "45_DAYS", label: "45 Days" },
  { value: "60_DAYS", label: "60 Days" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "Mobile Wallet", label: "Mobile Wallet" },
  { value: "UPI", label: "UPI" },
  { value: "Other", label: "Other" },
] as const;

// ── Phone validation ──────────────────────────────────────────────────
const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;

const phoneSchema = z
  .string()
  .trim()
  .regex(phoneRegex, "Invalid phone number format")
  .or(z.literal(""))
  .optional();

// ── Create Client Schema ──────────────────────────────────────────────
export const createClientSchema = z.object({
  // Basic Information
  name: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(200, "Client name cannot exceed 200 characters"),
  clientType: z.enum([
    "INDIVIDUAL", "RETAILER", "BOUTIQUE", "WHOLESALER",
    "MANUFACTURER", "EXPORT_CLIENT", "OTHER",
  ]).default("INDIVIDUAL"),
  companyName: z.string().trim().max(200).optional().or(z.literal("")),
  clientCode: z.string().trim().max(50).optional().or(z.literal("")),

  // Contact Information
  phone: z
    .string()
    .trim()
    .min(1, "Primary phone is required")
    .regex(phoneRegex, "Invalid phone number format"),
  secondaryPhone: phoneSchema,
  whatsappNumber: phoneSchema,
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(254)
    .optional()
    .or(z.literal("")),
  website: z.string().trim().max(500).optional().or(z.literal("")),

  // Address Information
  country: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(1000).optional().or(z.literal("")),

  // Business Information
  contactPerson: z.string().trim().max(200).optional().or(z.literal("")),
  designation: z.string().trim().max(100).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(50).optional().or(z.literal("")),
  businessRegNumber: z.string().trim().max(50).optional().or(z.literal("")),

  // Financial Information
  paymentTerms: z.string().optional().or(z.literal("")),
  creditLimit: z.coerce.number().min(0, "Credit limit cannot be negative").optional().default(0),
  openingBalance: z.coerce.number().min(0, "Opening balance cannot be negative").optional().default(0),
  currency: z.string().trim().max(10).optional().default("INR"),
  preferredPaymentMethod: z.string().optional().or(z.literal("")),

  // Order Preferences
  preferredGarmentType: z.string().trim().max(200).optional().or(z.literal("")),
  preferredFabric: z.string().trim().max(200).optional().or(z.literal("")),
  preferredColour: z.string().trim().max(200).optional().or(z.literal("")),
  preferredSizeChart: z.string().trim().max(200).optional().or(z.literal("")),
  preferredDeliveryMethod: z.string().trim().max(200).optional().or(z.literal("")),

  // Internal Information
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "BLACKLISTED"]).default("ACTIVE"),
  internalNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  specialInstructions: z.string().trim().max(5000).optional().or(z.literal("")),
});

export const updateClientSchema = createClientSchema.extend({
  id: z.string().min(1),
});

// ── Payment Schema ────────────────────────────────────────────────────
export const createPaymentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  orderId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  method: z.string().optional(),
  note: z.string().optional(),
});

// ── Client Note Schema ────────────────────────────────────────────────
export const createClientNoteSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  content: z
    .string()
    .trim()
    .min(1, "Note content is required")
    .max(5000, "Note cannot exceed 5000 characters"),
});

// ── Inferred Types ────────────────────────────────────────────────────
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateClientNoteInput = z.infer<typeof createClientNoteSchema>;
