import { getPrompt, setPrompt } from "@/lib/storage";
import { getDefaultPromptContent } from "@/lib/translate/build-prompt";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const prompt = await getPrompt();
    const content = prompt?.content ?? getDefaultPromptContent();
    return NextResponse.json({
      id: prompt?.id ?? "current",
      content,
      updatedAt: prompt?.updatedAt ?? null,
    });
  } catch (err) {
    console.error("GET /api/prompt:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load prompt" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content : "";
    if (!content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }
    const record = await setPrompt(content.trim());
    return NextResponse.json(record);
  } catch (err) {
    console.error("PUT /api/prompt:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save prompt" },
      { status: 500 }
    );
  }
}
