import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();
router.use(authenticate, requireRole("SUPER_ADMIN"));

router.get("/organizations", async (_req, res, next) => {
  try {
    const organizations = await prisma.organization.findMany({
      include: { _count: { select: { users: true, contacts: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ organizations });
  } catch (error) { next(error); }
});

router.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (error) { next(error); }
});

export { router as adminRouter };
