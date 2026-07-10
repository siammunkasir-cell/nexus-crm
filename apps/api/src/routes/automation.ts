import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";

const router = Router();
router.use(authenticate, scopeTenant);

const createAutomationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  trigger: z.record(z.unknown()).default({}),
  steps: z.array(z.record(z.unknown())).default([]),
  isActive: z.boolean().default(false),
});

router.get("/", async (req, res, next) => {
  try {
    const automations = await prisma.automation.findMany({
      where: { organizationId: req.organizationId },
    });
    res.json({ automations });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createAutomationSchema.parse(req.body);
    const automation = await prisma.automation.create({
      data: { ...data, organizationId: req.organizationId },
    });
    res.status(201).json({ automation });
  } catch (error) { next(error); }
});

export { router as automationRouter };
