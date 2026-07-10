import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";

const router = Router();
router.use(authenticate, scopeTenant);

const createDealSchema = z.object({
  title: z.string().min(1, "Title is required"),
  value: z.number().nonnegative().default(0),
  currency: z.string().default("USD"),
  probability: z.number().min(0).max(100).default(0),
  stageId: z.string(),
  pipelineId: z.string().optional(),
  contactId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  expectedCloseDate: z.string().datetime().optional(),
});

const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  stageId: z.string().optional(),
  pipelineId: z.string().optional(),
  contactId: z.string().uuid().nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  expectedCloseDate: z.string().datetime().nullable().optional(),
  wonAt: z.string().datetime().nullable().optional(),
  lostAt: z.string().datetime().nullable().optional(),
  lostReason: z.string().nullable().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId: req.organizationId },
      include: {
        deals: {
          include: { contact: { select: { id: true, firstName: true, lastName: true, avatar: true } }, assignedTo: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    res.json({ pipelines });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createDealSchema.parse(req.body);
    const pipeline = await prisma.pipeline.create({
      data: { ...data, organizationId: req.organizationId },
    });
    res.status(201).json({ pipeline });
  } catch (error) { next(error); }
});

// Deal-specific routes
router.get("/deals", async (req, res, next) => {
  try {
    const deals = await prisma.deal.findMany({
      where: { organizationId: req.organizationId },
      include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } }, pipeline: { select: { id: true, name: true, stages: true } }, assignedTo: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ deals });
  } catch (error) { next(error); }
});

router.post("/deals", async (req, res, next) => {
  try {
    const data = createDealSchema.parse(req.body);
    const deal = await prisma.deal.create({
      data: { ...data, organizationId: req.organizationId },
    });
    res.status(201).json({ deal });
  } catch (error) { next(error); }
});

router.patch("/deals/:id", async (req, res, next) => {
  try {
    const data = updateDealSchema.parse(req.body);
    const deal = await prisma.deal.update({
      where: { id: req.params.id, organizationId: req.organizationId },
      data,
    });
    res.json({ deal });
  } catch (error) { next(error); }
});

router.delete("/deals/:id", async (req, res, next) => {
  try {
    await prisma.deal.delete({
      where: { id: req.params.id, organizationId: req.organizationId },
    });
    res.status(204).end();
  } catch (error) { next(error); }
});

export { router as dealsRouter };
