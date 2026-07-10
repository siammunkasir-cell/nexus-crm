import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";

const router = Router();
router.use(authenticate, scopeTenant);

const createInvoiceSchema = z.object({
  number: z.string().min(1, "Invoice number is required"),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).default("DRAFT"),
  currency: z.string().default("USD"),
  dueDate: z.string().datetime().optional(),
  lineItems: z.array(z.record(z.unknown())).default([]),
  subtotal: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
  contactId: z.string().uuid().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ invoices });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    const invoice = await prisma.invoice.create({
      data: { ...data, organizationId: req.organizationId },
    });
    res.status(201).json({ invoice });
  } catch (error) { next(error); }
});

export { router as invoicesRouter };
