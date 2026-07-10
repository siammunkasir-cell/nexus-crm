import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { env } from "../env";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";

const router = Router();

// ─── Validation Schemas ───
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  organizationName: z.string().min(1, "Organization name is required"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

// ─── Helpers ───
function generateTokens(user: { id: string; organizationId: string | null; role: string }) {
  const accessToken = jwt.sign(
    { userId: user.id, organizationId: user.organizationId, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  const refreshToken = uuidv4();

  return { accessToken, refreshToken };
}

// ─── POST /api/auth/register ───
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name, organizationName } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(409, "An account with this email already exists", "EMAIL_EXISTS");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        },
      });

      const newUser = await tx.user.create({
        data: {
          email,
          name,
          hashedPassword,
          role: "ADMIN",
          organizationId: org.id,
        },
      });

      await tx.organization.update({
        where: { id: org.id },
        data: { ownerId: newUser.id },
      });

      return newUser;
    });

    const tokens = generateTokens(user);

    // Create session
    const session = await prisma.session.create({
      data: {
        sessionToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers["user-agent"] || "",
        ipAddress: req.ip,
      },
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: session.id,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/login ───
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.hashedPassword) {
      throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const tokens = generateTokens(user);

    const session = await prisma.session.create({
      data: {
        sessionToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers["user-agent"] || "",
        ipAddress: req.ip,
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        organizationId: user.organizationId,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: session.id,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/refresh ───
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, "Refresh token is required", "MISSING_TOKEN");
    }

    const session = await prisma.session.findFirst({
      where: { refreshToken, isRevoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!session) {
      throw new AppError(401, "Invalid or expired refresh token", "INVALID_REFRESH");
    }

    // Revoke old session
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    const tokens = generateTokens(session.user);

    const newSession = await prisma.session.create({
      data: {
        sessionToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers["user-agent"] || "",
        ipAddress: req.ip,
      },
    });

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: newSession.id,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/logout ───
router.post("/logout", authenticate, async (req, res, next) => {
  try {
    await prisma.session.updateMany({
      where: { userId: req.user!.userId, isRevoked: false },
      data: { isRevoked: true },
    });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/forgot-password ───
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ message: "If the email exists, a reset link has been sent" });
      return;
    }

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
        type: "PASSWORD_RESET",
      },
    });

    // In production, send email via Resend
    console.log(`🔑 Password reset token for ${email}: ${token}`);

    res.json({ message: "If the email exists, a reset link has been sent" });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/reset-password ───
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const verification = await prisma.verificationToken.findFirst({
      where: { token, type: "PASSWORD_RESET", expires: { gt: new Date() } },
    });

    if (!verification) {
      throw new AppError(400, "Invalid or expired reset token", "INVALID_TOKEN");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email: verification.identifier },
      data: { hashedPassword },
    });

    await prisma.verificationToken.delete({ where: { id: verification.id } });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/auth/me ───
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        organizationId: true,
        emailVerified: true,
        twoFactorEnabled: true,
        organization: {
          select: { id: true, name: true, slug: true, logo: true, plan: true },
        },
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/auth/sessions ───
router.get("/sessions", authenticate, async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/sessions/:id/revoke ───
router.post("/sessions/:id/revoke", authenticate, async (req, res, next) => {
  try {
    await prisma.session.update({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRevoked: true },
    });

    res.json({ message: "Session revoked" });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
