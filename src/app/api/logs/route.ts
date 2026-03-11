import { getLogById, getLogs } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      const log = await getLogById(id);
      if (!log) {
        return NextResponse.json({ error: "Log not found" }, { status: 404 });
      }
      return NextResponse.json(log);
    }

    const logs = await getLogs();
    return NextResponse.json(logs);
  } catch (err) {
    console.error("GET /api/logs error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load translation logs",
      },
      { status: 500 }
    );
  }
}

