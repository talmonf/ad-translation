import {
  addExample,
  getExamples,
  setExamples,
} from "@/lib/storage";
import type { Example } from "@/lib/storage/types";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const examples = await getExamples();
    return NextResponse.json(examples);
  } catch (err) {
    console.error("GET /api/examples:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load examples" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourcePhrase =
      typeof body.sourcePhrase === "string" ? body.sourcePhrase.trim() : "";
    const correctTranslation =
      typeof body.correctTranslation === "string"
        ? body.correctTranslation.trim()
        : "";
    const explanation =
      typeof body.explanation === "string" ? body.explanation.trim() : "";
    if (!sourcePhrase || !correctTranslation) {
      return NextResponse.json(
        { error: "sourcePhrase and correctTranslation are required" },
        { status: 400 }
      );
    }
    const example = await addExample({
      sourcePhrase,
      correctTranslation,
      explanation,
    });
    return NextResponse.json(example);
  } catch (err) {
    console.error("POST /api/examples:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add example" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const examples = Array.isArray(body) ? body : body.examples;
    if (!Array.isArray(examples)) {
      return NextResponse.json(
        { error: "examples array required" },
        { status: 400 }
      );
    }
    const valid: Example[] = examples
      .filter(
        (e: unknown) =>
          e &&
          typeof e === "object" &&
          "id" in e &&
          "sourcePhrase" in e &&
          "correctTranslation" in e
      )
      .map(
        (e: {
          id: string;
          sourcePhrase: string;
          correctTranslation: string;
          explanation?: string;
        }) => ({
          id: String(e.id),
          sourcePhrase: String(e.sourcePhrase).trim(),
          correctTranslation: String(e.correctTranslation).trim(),
          explanation:
            e.explanation != null ? String(e.explanation).trim() : "",
        })
      );
    await setExamples(valid);
    return NextResponse.json(valid);
  } catch (err) {
    console.error("PUT /api/examples:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save examples" },
      { status: 500 }
    );
  }
}
