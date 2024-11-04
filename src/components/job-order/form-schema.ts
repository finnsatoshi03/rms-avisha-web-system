import { z } from "zod";

const materialSchema = z.object({
  used: z.boolean().nullable().optional(),
  material: z.string().min(1, "Material is required"),
  material_id: z.string().min(1, "Material ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
});

// Define the base schema with all possible fields
const baseSchema = z.object({
  branch_id: z.number().optional(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .regex(/^[A-Za-z\s]+$/, {
      message: "Name must only contain letters and spaces.",
    })
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
  rate: z.number().min(1, "Rate is required"),
  brand_model: z.string().optional(),
  labor_description: z.string().optional(),
  machine_type: z.string().optional(),
  problem_statement: z.string().optional(),
  technician_id: z.string().optional().nullable(),
});

// Additional fields schema
const additionalFieldsSchema = z.object({
  serial_number: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 3, {
      message: "At least 3 characters required",
    }),
  additional_comments: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "At least 10 characters required",
    }),
  amount: z
    .number()
    .optional()
    .refine((val) => !val || val >= 0, {
      message: "Amount must be non-negative",
    }),
  accessories: z.array(z.string()).optional(),
  technical_report: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "Technical report must be at least 10 characters long",
    }),
  downpayment: z.number().optional().nullable(),
});

// Merge base schema with additional fields
const mergedSchema = baseSchema.merge(additionalFieldsSchema);

// Create the validation function
const validateFormData = (data: z.infer<typeof mergedSchema>) => {
  const isHomeService = [2000, 500, 1100].includes(data.rate);

  const issues: z.ZodIssue[] = [];

  if (!isHomeService) {
    if (!data.brand_model?.trim()) {
      issues.push({
        code: z.ZodIssueCode.custom,
        message: "Brand Model is required for non-home service",
        path: ["brand_model"],
      });
    }

    if (!data.labor_description?.trim()) {
      issues.push({
        code: z.ZodIssueCode.custom,
        message: "Labor description is required for non-home service",
        path: ["labor_description"],
      });
    }

    if (!data.machine_type?.trim()) {
      issues.push({
        code: z.ZodIssueCode.custom,
        message: "Machine type is required for non-home service",
        path: ["machine_type"],
      });
    }

    if (!data.problem_statement?.trim()) {
      issues.push({
        code: z.ZodIssueCode.custom,
        message: "Problem statement is required for non-home service",
        path: ["problem_statement"],
      });
    }
  }

  if (!data.technician_id && !data.order_received) {
    issues.push(
      {
        code: z.ZodIssueCode.custom,
        message: "Either technician ID or order received must be provided.",
        path: ["technician_id"],
      },
      {
        code: z.ZodIssueCode.custom,
        message: "Either technician ID or order received must be provided.",
        path: ["order_received"],
      }
    );
  }

  if (issues.length > 0) {
    throw new z.ZodError(issues);
  }

  return true;
};

// Create the final schema function
const formSchema = (isAdmin: boolean) => {
  const schema = mergedSchema.refine(validateFormData);

  return isAdmin
    ? schema.extend({
        branch_id: z.number().min(1, "Branch is required"),
      })
    : schema;
};

export { formSchema, materialSchema, baseSchema, mergedSchema };
