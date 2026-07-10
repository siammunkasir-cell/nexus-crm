import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";
import { auditLog } from "../middleware/auditLog";

const router = Router();
router.use(authenticate, scopeTenant);

const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  status: z.enum(["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"]).default("LEAD"),
  customFields: z.record(z.unknown()).default({}),
  notes: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
});

const updateContactSchema = createContactSchema.partial();

// GET /api/contacts
router.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const search = req.query.search as string;
    const status = req.query.status as string;
    const tags = req.query.tags as string;
    const assignedToId = req.query.assignedToId as string;

    const where: any = { organizationId: req.organizationId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (tags) where.tags = { hasSome: tags.split(",") };
    if (assignedToId) where.assignedToId = assignedToId;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          deals: { select: { id: true, title: true, value: true, stageId: true } },
          assignedTo: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      contacts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contacts/:id
router.get("/:id", async (req, res, next) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, organizationId: req.organizationId },
      include: {
        deals: { include: { pipeline: { select: { name: true, stages: true } } } },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        conversations: { include: { messages: { take: 1, orderBy: { createdAt: "desc" } } } },
        invoices: { orderBy: { createdAt: "desc" }, take: 10 },
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!contact) throw new AppError(404, "Contact not found");

    res.json({ contact });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts
router.post("/", auditLog("CREATE", "contact"), async (req, res, next) => {
  try {
    const data = createContactSchema.parse(req.body);
    const contact = await prisma.contact.create({
      data: { ...data, organizationId: req.organizationId! },
    });
    res.status(201).json({ contact });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/contacts/:id
router.patch("/:id", auditLog("UPDATE", "contact"), async (req, res, next) => {
  try {
    const data = updateContactSchema.parse(req.body);
    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, organizationId: req.organizationId },
    });
    if (!existing) throw new AppError(404, "Contact not found");

    (req as any).oldValue = existing;

    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ contact });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/contacts/:id
router.delete("/:id", auditLog("DELETE", "contact"), async (req, res, next) => {
  try {
    const existing = await prisma.contact.findFirst({
      where: { id: req.params.id, organizationId: req.organizationId },
    });
    if (!existing) throw new AppError(404, "Contact not found");

    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ message: "Contact deleted" });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/:id/assign
router.post("/:id/assign", async (req, res, next) => {
  try {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { assignedToId: userId },
    });
    res.json({ contact });
  } catch (error) {
    next(error);
  }
});

export { router as contactsRouter };
