import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../config/env.js";

export async function createSocketServer(httpServer: HttpServer): Promise<Server> {
  const io = new Server(httpServer, {
    cors: {
      origin: [env.WEB_ORIGIN, env.ADMIN_ORIGIN],
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
