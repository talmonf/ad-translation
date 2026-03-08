import { deleteExample, updateExample } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: {
      sourcePhrase?: string;
      correctTranslation?: string;
      explanation?: string;
    } = {};
    if (typeof body.sourcePhrase === "string")
      updates.sourcePhrase = body.sourcePhrase.trim();
    if (typeof body.correctTranslation === "string")
      updates.correctTranslation = body.correctTranslation.trim();
    if (typeof body.explanation === "string")
      updates.explanation = body.explanation.trim();
    const example = await updateExample(id, updates);
    if (!example) {
      return NextResponse.json({ error: "Example not found" }, { status: 404 });
    }
    return NextResponse.json(example);
  } catch (err) {
    console.error("PATCH /api/examples/[id]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update example" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteExample(id);
    if (!deleted) {
      return NextResponse.json({ error: "Example not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/examples/[id]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete example" },
      { status: 500 }
    );
  }
}
