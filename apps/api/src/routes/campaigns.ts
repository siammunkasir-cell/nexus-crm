import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";

const router = Router();
router.use(authenticate, scopeTenant);

const createCampaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["EMAIL", "SMS", "SOCIAL", "SEQUENCE"]).default("EMAIL"),
  status: z.enum(["DRAFT", "SCHEDULED", "RUNNING", "PAUSED", "COMPLETED"]).default("DRAFT"),
  subject: z.string().optional(),
  body: z.string().optional(),
  audienceFilter: z.record(z.unknown()).default({}),
  scheduledAt: z.string().datetime().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ campaigns });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createCampaignSchema.parse(req.body);
    const campaign = await prisma.campaign.create({
      data: { ...data, organizationId: req.organizationId },
    });
    res.status(201).json({ campaign });
  } catch (error) { next(error); }
});

export { router as campaignsRouter };
