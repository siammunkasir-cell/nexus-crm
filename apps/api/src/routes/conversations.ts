import { Router } from "express";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";

const router = Router();
router.use(authenticate, scopeTenant);

router.get("/", async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { organizationId: req.organizationId },
      include: { contact: { select: { id: true, firstName: true, lastName: true, avatar: true } }, messages: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { lastMessageAt: "desc" },
    });
    res.json({ conversations });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, organizationId: req.organizationId },
      include: { messages: { orderBy: { createdAt: "asc" } }, contact: true },
    });
    res.json({ conversation });
  } catch (error) { next(error); }
});

export { router as conversationsRouter };
