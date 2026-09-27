import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "@silakebap/database";
import { StaffRole } from "@silakebap/shared";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthPayload } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().min(1).max(200),
  password: z.string().min(10).max(128),
});

const STAFF_LOGIN: Record<string, string> = {
  admin: "admin@silakebap.local",
  mutfak: "mutfak@silakebap.local",
  kurye: "kurye@silakebap.local",
};

function resolveStaffLogin(raw: string): string {
  const value = raw.trim().toLowerCase();
  return STAFF_LOGIN[value] ?? value;
}

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

function signAccess(payload: AuthPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
}

function signRefresh(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

async function staffPayload(userId: string): Promise<AuthPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { staffMemberships: true },
  });
  if (!user) throw new HttpError(401, "Invalid credentials");
  const isStaff = user.isSuperAdmin || user.staffMemberships.length > 0;
  if (!isStaff) throw new HttpError(403, "Staff access only");
  return {
    sub: user.id,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    memberships: user.staffMemberships.map((m) => ({
      branchId: m.branchId,
      role: m.role as StaffRole,
    })),
  };
}

authRouter.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: resolveStaffLogin(body.email) },
      include: { staffMemberships: true },
    });
    if (!user?.passwordHash) {
      throw new HttpError(401, "Invalid credentials");
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      throw new HttpError(401, "Invalid credentials");
    }

    const payload = await staffPayload(user.id);
    res.json({
      accessToken: signAccess(payload),
      refreshToken: signRefresh(user.id),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin,
        memberships: payload.memberships,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", authRateLimiter, async (req, res, next) => {
  try {
    const body = refreshSchema.parse(req.body);
    let sub: string;
    try {
      const decoded = jwt.verify(body.refreshToken, env.JWT_REFRESH_SECRET) as {
        sub?: string;
      };
      if (!decoded.sub) throw new Error("no sub");
      sub = decoded.sub;
    } catch {
      throw new HttpError(401, "Invalid credentials");
    }
    const payload = await staffPayload(sub);
    res.json({
      accessToken: signAccess(payload),
      refreshToken: signRefresh(sub),
    });
  } catch (err) {
    next(err);
  }
});
