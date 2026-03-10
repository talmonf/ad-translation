import { NextResponse } from "next/server";
import OpenAI from "openai";

const SUPPORTED_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Hebrew",
  "Portuguese",
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text =
      typeof body.text === "string" && body.text.trim() ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Missing text" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // If we cannot detect automatically, fall back gracefully
      return NextResponse.json({ language: null });
    }

    const openai = new OpenAI({ apiKey });

    const system = [
      "You are a language detector.",
      "Given some user text, you must respond with exactly one language name",
      "from this list:",
      SUPPORTED_LANGUAGES.join(", "),
      "",
      "Rules:",
      "- Respond with ONLY the language name, no punctuation or explanation.",
      "- If you are unsure, choose the closest match from the list.",
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
      temperature: 0,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ language: null });
    }

    const candidate = String(content).trim();
    const match = SUPPORTED_LANGUAGES.find(
      (lang) => lang.toLowerCase() === candidate.toLowerCase()
    );

    return NextResponse.json({ language: match ?? null });
  } catch (err) {
    console.error("Detect language error:", err);
    return NextResponse.json(
      { error: "Failed to detect language", language: null },
      { status: 500 }
    );
  }
}

