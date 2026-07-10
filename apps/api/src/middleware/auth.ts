import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { AppError } from "./errorHandler";

export interface AuthPayload {
  userId: string;
  organizationId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid authorization header", "UNAUTHORIZED");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw new AppError(401, "Missing token", "UNAUTHORIZED");
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, "Invalid or expired token", "UNAUTHORIZED");
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "Insufficient permissions", "FORBIDDEN");
    }
    next();
  };
}
