import {
  addPromptVersion,
  getPromptVersions,
} from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const versions = await getPromptVersions();
    return NextResponse.json(versions);
  } catch (err) {
    console.error("GET /api/prompt/versions:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load versions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const content = typeof body.content === "string" ? body.content : "";
    const name = typeof body.name === "string" ? body.name : undefined;
    if (!content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }
    const version = await addPromptVersion(content.trim(), name);
    return NextResponse.json(version);
  } catch (err) {
    console.error("POST /api/prompt/versions:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save version" },
      { status: 500 }
    );
  }
}
