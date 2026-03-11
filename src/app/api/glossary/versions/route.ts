import {
  addGlossaryVersion,
  getGlossary,
  getGlossaryVersions,
} from "@/lib/storage";
import type { GlossaryVersion } from "@/lib/storage/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const versions = await getGlossaryVersions();
    return NextResponse.json(versions);
  } catch (err) {
    console.error("GET /api/glossary/versions:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load glossary versions",
      },
      { status: 500 }
    );
  }
}

interface CreateGlossaryVersionBody {
  name?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as
      | CreateGlossaryVersionBody
      | undefined;
    const name =
      body && typeof body.name === "string" ? body.name.trim() : undefined;
    const entries = await getGlossary();
    const version: GlossaryVersion = await addGlossaryVersion(entries, name);
    return NextResponse.json(version);
  } catch (err) {
    console.error("POST /api/glossary/versions:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to create glossary version",
      },
      { status: 500 }
    );
  }
}

