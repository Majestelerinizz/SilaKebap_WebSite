import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../config/env.js";

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === env.WEB_ORIGIN || origin === env.ADMIN_ORIGIN) return true;
  if (env.NODE_ENV === "production") return false;
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host.endsWith(".trycloudflare.com")) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  } catch {
    return false;
  }
  return false;
}

export async function createSocketServer(httpServer: HttpServer): Promise<Server> {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
    },
  });

  try {
    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.io Redis adapter connected");
  } catch (err) {
    console.warn("Socket.io running without Redis adapter:", err);
  }

  io.on("connection", (socket) => {
    socket.on("join:kitchen", (branchId: string) => {
      if (typeof branchId === "string") {
        void socket.join(`branch:${branchId}:kitchen`);
      }
    });
    socket.on("join:courier", (branchId: string) => {
      if (typeof branchId === "string") {
        void socket.join(`branch:${branchId}:courier`);
      }
    });
    socket.on("join:admin", (branchId: string) => {
      if (typeof branchId === "string") {
        void socket.join(`branch:${branchId}:admin`);
      }
    });
    socket.on("join:order", (orderId: string) => {
      if (typeof orderId === "string") {
        void socket.join(`order:${orderId}`);
      }
    });
  });

  return io;
}
