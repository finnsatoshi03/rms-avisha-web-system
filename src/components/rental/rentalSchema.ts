import { z } from "zod";

// Consumable item schema (ink bottles, etc.)
const consumableSchema = z.object({
  material_stock_id: z.number().nullable().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price must be non-negative"),
  is_manual: z.boolean(),
  notes: z.string().optional(),
});

// Main rental form schema
export const rentalFormSchema = z.object({
  branch_id: z.number({ required_error: "Branch is required" }),
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
      "Must be a valid PH contact number starting with +63 9 and followed by 9 digits with spaces."
    )
    .min(16, "Contact number must be 16 characters long including spaces.")
    .max(16, "Contact number must be 16 characters long including spaces."),
  email: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val === "" || /.+@.+\..+/.test(val),
      "Must be a valid email address."
    ),
  rental_asset_id: z.number({ required_error: "Select a printer" }),
  technician_id: z.string().optional().nullable(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  due_date: z.string().min(1, "Due date is required"),
  rental_type: z.enum(["DAILY", "MONTHLY"]),
  rate_amount: z.number().min(0, "Rate must be non-negative"),
  notes: z.string().optional(),
  consumables: z.array(consumableSchema).optional(),
  billing_account_id: z.string().optional().nullable(),
});

// Rental asset (printer) form schema
export const rentalAssetFormSchema = z.object({
  unit_name: z.string().min(2, "Name must be at least 2 characters"),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  daily_rate: z.number().min(0, "Rate must be non-negative"),
  monthly_rate: z.number().min(0, "Rate must be non-negative"),
  branch_id: z.number({ required_error: "Branch is required" }),
  notes: z.string().optional(),
});

// Return inspection form schema
export const inspectionFormSchema = z.object({
  physical_condition: z.string().optional(),
  print_quality: z.string().optional(),
  meter_reading_start: z.number().optional().nullable(),
  meter_reading_end: z.number().optional().nullable(),
  accessories_returned: z.string().optional(),
  missing_items: z.string().optional(),
  damage_assessment: z.string().optional(),
  damage_penalty: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type RentalFormValues = z.infer<typeof rentalFormSchema>;
export type RentalAssetFormValues = z.infer<typeof rentalAssetFormSchema>;
export type InspectionFormValues = z.infer<typeof inspectionFormSchema>;
