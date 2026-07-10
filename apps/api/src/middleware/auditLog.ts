import type { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";

/**
 * Middleware factory: logs an audit trail entry after the response is sent.
 */
export function auditLog(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    let responseBody: unknown;

    res.json = function (body: unknown) {
      responseBody = body;
      return originalJson(body);
    };

    res.on("finish", async () => {
      if (req.user && res.statusCode < 500) {
        try {
          await prisma.auditLog.create({
            data: {
              action,
              resource,
              resourceId: (req.params as Record<string, string>).id,
              userId: req.user.userId,
              organizationId: req.user.organizationId,
              ipAddress: req.ip,
              oldValue: (req as any).oldValue ?? undefined,
              newValue: responseBody ? JSON.parse(JSON.stringify(responseBody)) : undefined,
            },
          });
        } catch (error) {
          console.error("Audit log error:", error);
        }
      }
    });

    next();
  };
}
