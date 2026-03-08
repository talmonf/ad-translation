import { deletePromptVersion } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deletePromptVersion(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/prompt/versions/[id]:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete version" },
      { status: 500 }
    );
  }
}
