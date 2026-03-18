import { z } from "zod";

const materialSchema = z.object({
  used: z.boolean().nullable().optional(),
  material: z.string().min(1, "Material is required"),
  material_id: z.string().min(1, "Material ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
});

export const baseSchema = z.object({
  branch_id: z.number().optional(),
  client_id: z.number().optional().nullable(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .trim()
    .min(1, "Name is required."),
  contact_number: z
    .string()
    .regex(
      /^\+63 9[0-9]{2} [0-9]{3} [0-9]{4}$/,
      "Must be a valid PHP contact number starting with +63 9 and followed by 9 digits with spaces."
    )
    .min(
      16,
      "Contact number must include country code +63 and be 16 characters long including spaces."
    )
    .max(
      16,
      "Contact number must include country code +63 and be 16 characters long including spaces."
    ),
  email: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val === "" || /.+@.+\..+/.test(val),
      "Must be a valid email address."
    ),
  order_received: z.string().optional().nullable(),
  materials: z.array(materialSchema).optional(),
  brand_model: z.string().optional(),
  serial_number: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 3, {
      message: "At least 3 characters required",
    }),
  machine_type: z.union([
    z.enum(["printer", "laptop", "desktop/pc", "electric typewriter"]),
    z.string().optional(),
    // .min(1, "Machine type is required")
    // .refine(
    //   (val) => val !== "others" || val.trim() !== "",
    //   "Specify machine type if 'Other' is selected"
    // ),
  ]),
  problem_statement: z.string().min(10, "At least 10 characters required"),
  additional_comments: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "At least 10 characters required",
    }),
  labor_description: z.string().optional(),
  // .min(10, "At least 10 characters required"),
  rate: z.number().min(-1, "Rate is required"),
  amount: z
    .number()
    .optional()
    .refine((val) => !val || val >= 0, {
      message: "Amount must be non-negative",
    }),
  accessories: z.array(z.string()).optional(),
  technician_id: z.string().optional().nullable(),
  technical_report: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "Technical report must be at least 10 characters long",
    }),
  downpayment: z.number().optional().nullable(),
  warranty_months: z.number().min(0).max(3).optional(),
});
