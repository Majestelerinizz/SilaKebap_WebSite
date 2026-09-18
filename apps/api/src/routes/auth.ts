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

/** Login body: min 10 chars (policy). Comparison still uses stored hash. */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

authRouter.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { staffMemberships: true },
    });
    if (!user?.passwordHash) {
      throw new HttpError(401, "Invalid credentials");
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      throw new HttpError(401, "Invalid credentials");
    }

    const isStaff =
      user.isSuperAdmin || user.staffMemberships.length > 0;
    if (!isStaff) {
      throw new HttpError(403, "Staff access only");
    }

    const payload: AuthPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      memberships: user.staffMemberships.map((m) => ({
        branchId: m.branchId,
        role: m.role as StaffRole,
      })),
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(
      { sub: user.id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      accessToken,
      refreshToken,
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
