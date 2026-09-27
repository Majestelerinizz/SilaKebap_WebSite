import { io, type Socket } from "socket.io-client";

function isLocalHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);
}

export async function resolveSocketUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    return `http://${window.location.hostname}:4000`;
  }
  try {
    const res = await fetch("/ops-realtime");
    if (!res.ok) return "";
    const data = (await res.json()) as { url?: string };
    return data.url?.replace(/\/$/, "") ?? "";
  } catch {
    return "";
  }
}

export function watchOrders(options: {
  branchId: string;
  room: "kitchen" | "courier" | "admin";
  onChange: () => void;
  onLive?: (live: boolean) => void;
}): () => void {
  let socket: Socket | null = null;
  let stopped = false;
  const poll = setInterval(options.onChange, 4000);

  void (async () => {
    const url = await resolveSocketUrl();
    if (stopped || !url) return;
    socket = io(url, { transports: ["websocket", "polling"] });
    const join = () => {
      socket?.emit(`join:${options.room}`, options.branchId);
      options.onLive?.(true);
    };
    socket.on("connect", join);
    socket.on("disconnect", () => options.onLive?.(false));
    socket.on("order:created", options.onChange);
    socket.on("order:updated", options.onChange);
  })();

  return () => {
    stopped = true;
    clearInterval(poll);
    socket?.disconnect();
    options.onLive?.(false);
  };
}
