import { getGlossary, getPrompt } from "@/lib/storage";
import { buildSystemPrompt, getDefaultPromptContent } from "@/lib/translate/build-prompt";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const targetLanguageDefault = "English";
type Provider = "openai" | "claude" | "gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const targetLanguage =
      typeof body.targetLanguage === "string" && body.targetLanguage.trim()
        ? body.targetLanguage.trim()
        : targetLanguageDefault;
    const provider = ["openai", "claude", "gemini"].includes(body.provider)
      ? (body.provider as Provider)
      : null;

    if (!text) {
      return NextResponse.json(
        { error: "Missing or empty text" },
        { status: 400 }
      );
    }

    const [promptRecord, glossary] = await Promise.all([
      getPrompt(),
      getGlossary(),
    ]);
    const promptContent =
      promptRecord?.content ?? getDefaultPromptContent();
    const systemPrompt = buildSystemPrompt(
      promptContent,
      glossary,
      targetLanguage
    );

    if (provider) {
      if (provider === "openai") {
        const result = await translateOpenAI(systemPrompt, text);
        return NextResponse.json({ text: result });
      }
      if (provider === "claude") {
        const result = await translateClaude(systemPrompt, text);
        return NextResponse.json({ text: result });
      }
      const result = await translateGemini(systemPrompt, text);
      return NextResponse.json({ text: result });
    }

    const results = await Promise.allSettled([
      translateOpenAI(systemPrompt, text),
      translateClaude(systemPrompt, text),
      translateGemini(systemPrompt, text),
    ]);

    const openai =
      results[0].status === "fulfilled"
        ? { text: results[0].value, error: undefined }
        : { text: undefined, error: String(results[0].reason) };
    const claude =
      results[1].status === "fulfilled"
        ? { text: results[1].value, error: undefined }
        : { text: undefined, error: String(results[1].reason) };
    const gemini =
      results[2].status === "fulfilled"
        ? { text: results[2].value, error: undefined }
        : { text: undefined, error: String(results[2].reason) };

    return NextResponse.json({ openai, claude, gemini });
  } catch (err) {
    console.error("Translate API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Translation failed" },
      { status: 500 }
    );
  }
}

async function translateOpenAI(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (content == null) throw new Error("Empty OpenAI response");
  return content.trim();
}

async function translateClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = message.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  if (!text) throw new Error("Empty Claude response");
  return text.trim();
}

async function translateGemini(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: `${systemPrompt}\n\n---\n\nUser message to translate:\n\n${userMessage}` },
        ],
      },
    ],
  });
  const response = result.response;
  const content = response.text();
  if (!content) throw new Error("Empty Gemini response");
  return content.trim();
}
