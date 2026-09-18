/**
 * Cloudflare R2 helpers (S3-compatible).
 */
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";

export function mediaPublicUrl(key: string): string {
  if (env.R2_PUBLIC_URL) {
    return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
  }
  return key;
}

export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET,
  );
}

export function r2Status() {
  return {
    configured: isR2Configured(),
    bucket: env.R2_BUCKET || null,
    publicBase: env.R2_PUBLIC_URL || null,
  };
}

function getS3Client(): S3Client {
  if (!isR2Configured()) {
    throw new HttpError(503, "R2 storage is not configured");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function createProductImageUploadUrl(input: {
  productId: string;
  contentType: string;
}): Promise<{ uploadUrl: string; key: string; publicUrl: string | null }> {
  if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
    throw new HttpError(400, "Unsupported image type");
  }

  const ext = extensionFor(input.contentType);
  const key = `products/${input.productId}/${randomUUID()}.${ext}`;
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: input.contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

  return {
    uploadUrl,
    key,
    publicUrl: env.R2_PUBLIC_URL ? mediaPublicUrl(key) : null,
  };
}
