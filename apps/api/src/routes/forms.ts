import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";

const router = Router();
router.use(authenticate, scopeTenant);

const createFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  fields: z.array(z.record(z.unknown())).default([]),
  settings: z.record(z.unknown()).default({}),
  embedCode: z.string().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const forms = await prisma.form.findMany({
      where: { organizationId: req.organizationId },
      include: { _count: { select: { formSubmissions: true } } },
    });
    res.json({ forms });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createFormSchema.parse(req.body);
    const form = await prisma.form.create({
      data: { ...data, organizationId: req.organizationId },
    });
    res.status(201).json({ form });
  } catch (error) { next(error); }
});

export { router as formsRouter };
