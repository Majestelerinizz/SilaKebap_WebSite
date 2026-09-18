import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "./errorHandler.js";
import type { StaffRole } from "@silakebap/shared";

export type AuthPayload = {
  sub: string;
  email?: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{ branchId: string; role: StaffRole }>;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }
  try {
    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    next(new HttpError(401, "Invalid token"));
  }
}

export function requireRoles(...roles: StaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new HttpError(401, "Unauthorized"));
      return;
    }
    if (req.auth.isSuperAdmin) {
      next();
      return;
    }
    const hasRole = req.auth.memberships.some((m) => roles.includes(m.role));
    if (!hasRole) {
      next(new HttpError(403, "Forbidden"));
      return;
    }
    next();
  };
}
