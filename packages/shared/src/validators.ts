import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters");

export const uuidSchema = z.string().uuid("Invalid UUID");

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const contactStatusSchema = z.enum(["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"]);

export const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  status: contactStatusSchema.default("LEAD"),
  customFields: z.record(z.unknown()).default({}),
  notes: z.string().optional(),
  assignedToId: uuidSchema.optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, "Name is required"),
  organizationName: z.string().min(1, "Organization name is required"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const aiChatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: uuidSchema.optional(),
  context: z.object({
    page: z.string().optional(),
    contactId: uuidSchema.optional(),
    dealId: uuidSchema.optional(),
  }).optional(),
});
