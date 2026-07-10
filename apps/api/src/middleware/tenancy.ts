import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

/**
 * Multi-tenant scoping middleware.
 * Ensures every request is scoped to the user's organization.
 * Attaches organizationId to the request for downstream use.
 */
export function scopeTenant(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.organizationId) {
    throw new AppError(403, "No organization context", "NO_TENANT");
  }

  // Attach org ID for all downstream queries
  req.organizationId = req.user.organizationId;
  next();
}

declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}
