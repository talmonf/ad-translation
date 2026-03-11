import { deleteGlossaryVersion, getGlossaryVersions, setGlossary } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await deleteGlossaryVersion(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/glossary/versions/[id]:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete glossary version",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const versions = await getGlossaryVersions();
    const version = versions.find((v) => v.id === id);
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    await setGlossary(version.entries);
    return NextResponse.json(version);
  } catch (err) {
    console.error("POST /api/glossary/versions/[id]:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to restore glossary version",
      },
      { status: 500 }
    );
  }
}

