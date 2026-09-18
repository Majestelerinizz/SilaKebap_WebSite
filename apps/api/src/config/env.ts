import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), "../../../.env"),
];
for (const path of envCandidates) {
  if (existsSync(path)) {
    loadEnv({ path });
    break;
  }
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  IYZICO_API_KEY: z.string().optional().default(""),
  IYZICO_SECRET_KEY: z.string().optional().default(""),
  IYZICO_BASE_URL: z.string().default("https://sandbox-api.iyzipay.com"),
  API_PUBLIC_URL: z.string().default("http://localhost:4000"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().default("Sila Kebap <noreply@silakebap.local>"),
  SMTP_PORT: z.coerce.number().default(587),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  ADMIN_ORIGIN: z.string().default("http://localhost:3001"),
  API_PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default("development"),
  R2_ACCOUNT_ID: z.string().optional().default(""),
  R2_ACCESS_KEY_ID: z.string().optional().default(""),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  R2_BUCKET: z.string().optional().default("silakebap"),
  R2_PUBLIC_URL: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);
