import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";

const router = Router();
router.use(authenticate, scopeTenant);

router.get("/", async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const where: any = { organizationId: req.organizationId };
    if (dateFrom) where.createdAt = { gte: new Date(dateFrom as string) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo as string) };

    const [contacts, deals, visitors, campaigns] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.deal.aggregate({ where, _sum: { value: true }, _count: true }),
      prisma.websiteVisitor.count({ where: { organizationId: req.organizationId, entryAt: where.createdAt || { gte: new Date("2020-01-01") } } }),
      prisma.campaign.count({ where: { ...where, organizationId: req.organizationId } }),
    ]);

    res.json({
      analytics: {
        totalContacts: contacts,
        totalDealValue: deals._sum.value || 0,
        totalDeals: deals._count,
        totalVisitors: visitors,
        totalCampaigns: campaigns,
      },
    });
  } catch (error) { next(error); }
});

export { router as analyticsRouter };
