import { getGlossary, setGlossary } from "@/lib/storage";
import type { GlossaryEntry } from "@/lib/storage/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const entries = await getGlossary();
    return NextResponse.json(entries);
  } catch (err) {
    console.error("GET /api/glossary:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load glossary" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entries = Array.isArray(body) ? body : body.entries;
    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "entries array required" },
        { status: 400 }
      );
    }
    const valid: GlossaryEntry[] = entries
      .filter(
        (e: unknown) =>
          e &&
          typeof e === "object" &&
          "term" in e &&
          "translationOrDefinition" in e
      )
      .map((e: { term: string; translationOrDefinition: string; note?: string }) => ({
        term: String(e.term).trim(),
        translationOrDefinition: String(e.translationOrDefinition).trim(),
        note: e.note != null ? String(e.note).trim() : undefined,
      }))
      .filter((e) => e.term && e.translationOrDefinition);
    await setGlossary(valid);
    return NextResponse.json(valid);
  } catch (err) {
    console.error("POST /api/glossary:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save glossary" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
