import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const url = (
    process.env.SOCKET_PUBLIC_URL ??
    process.env.API_PUBLIC_URL ??
    ""
  ).replace(/\/$/, "");
  return NextResponse.json({ url });
}
