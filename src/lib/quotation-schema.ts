import { z } from "zod";

const quotationItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  qty: z.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price must be non-negative"),
  amount: z.number().min(0, "Amount must be non-negative"),
  material_id: z.string().optional(),
  is_manual: z.boolean().optional(),
}).refine((item) => item.is_manual || Boolean(item.material_id?.trim()), {
  message: "Please select an inventory item or enable manual input",
  path: ["material_id"],
});

const quotationSchema = z.object({
  company: z.string().optional(),
  address: z.string().optional(),
  validity_months: z.number().min(1, "Validity period is required"),
  labor_rate: z.number().min(0, "Labor rate must be non-negative"),
  amount: z.number().min(0, "Amount must be non-negative"),
  note: z.string().optional(),
  quotation_items: z.array(quotationItemSchema).optional(),
  auto_generate_quote_no: z.boolean().default(true),
  manual_quote_no: z.string().optional(),
});

export type QuotationFormData = z.infer<typeof quotationSchema>;

export function createQuotationSchema(
  isNumberAvailable: (number: string, quotationId?: number) => Promise<boolean>,
  quotationId?: number,
  originalNumber?: string,
) {
  return quotationSchema.superRefine(async (data, ctx) => {
    if (data.auto_generate_quote_no) return;
    const number = data.manual_quote_no?.trim();
    const issue = (message: string) => ctx.addIssue({
      code: z.ZodIssueCode.custom, path: ["manual_quote_no"], message,
    });
    if (!number) {
      issue("Enter a quotation number or enable auto-generate.");
      return;
    }
    // Keeping an existing number is not a rename and needs no remote lookup.
    if (quotationId && number === originalNumber?.trim()) return;
    try {
      if (!await isNumberAvailable(number, quotationId)) {
        issue("Another quotation uses this number. Choose a different number.");
      }
    } catch {
      issue("Could not check the quotation number. Please try again.");
    }
  });
}
