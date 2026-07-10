import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";

const router = Router();
router.use(authenticate, scopeTenant);

const createFunnelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  totalVisits: z.number().int().nonnegative().default(0),
  totalConversions: z.number().int().nonnegative().default(0),
  revenue: z.number().nonnegative().default(0),
});

router.get("/", async (req, res, next) => {
  try {
    const funnels = await prisma.funnel.findMany({
      where: { organizationId: req.organizationId },
      include: { pages: true },
    });
    res.json({ funnels });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, totalVisits, totalConversions, revenue } = createFunnelSchema.parse(req.body);
    const funnel = await prisma.funnel.create({
      data: { name, totalVisits, totalConversions, revenue, organizationId: req.organizationId },
    });
    res.status(201).json({ funnel });
  } catch (error) { next(error); }
});

export { router as funnelsRouter };
