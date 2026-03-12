import { getGlossary, getPrompt } from "@/lib/storage";
import {
  buildSystemPrompt,
  getDefaultPromptContent,
} from "@/lib/translate/build-prompt";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const targetLanguageDefault = "English";

// Model choices: compare both high-quality and fast/cheap tiers.
const OPENAI_MODEL_4O = "gpt-4o";
const OPENAI_MODEL_4O_MINI = "gpt-4o-mini";
// Use current Claude 4.x aliases from Anthropic docs.
const CLAUDE_MODEL_SONNET = "claude-sonnet-4-6";
const CLAUDE_MODEL_HAIKU = "claude-haiku-4-5";
// Use current Gemini 2.5 models from Google Gemini API docs.
const GEMINI_MODEL_PRO = "gemini-2.5-pro";
const GEMINI_MODEL_FLASH = "gemini-2.5-flash";

type ProviderId =
  | "openai-gpt-4o"
  | "openai-gpt-4o-mini"
  | "claude-sonnet"
  | "claude-haiku"
  | "gemini-pro"
  | "gemini-flash";

function normalizeTranslationOutput(raw: string): string {
  let text = raw.trim();
  if (!text) return text;

  // Keep only the first logical paragraph (up to the first blank line),
  // which should contain the actual translation. This strips explanations,
  // notes, or multiple options that follow.
  const doubleNewlineIndex = text.indexOf("\n\n");
  if (doubleNewlineIndex !== -1) {
    text = text.slice(0, doubleNewlineIndex).trim();
  }

  // Strip leading/trailing quotes if the model wrapped the sentence.
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("“") && text.endsWith("”"))
  ) {
    text = text.slice(1, -1).trim();
  }

  return text;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const targetLanguage =
      typeof body.targetLanguage === "string" && body.targetLanguage.trim()
        ? body.targetLanguage.trim()
        : targetLanguageDefault;
    const provider: ProviderId | null =
      typeof body.provider === "string" &&
      [
        "openai-gpt-4o",
        "openai-gpt-4o-mini",
        "claude-sonnet",
        "claude-haiku",
        "gemini-pro",
        "gemini-flash",
      ].includes(body.provider)
        ? (body.provider as ProviderId)
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

    if (!provider) {
      return NextResponse.json(
        { error: "Invalid or missing provider" },
        { status: 400 }
      );
    }

    const startedAt = Date.now();

    if (provider === "openai-gpt-4o") {
      const result = await translateOpenAI(systemPrompt, text, OPENAI_MODEL_4O);
      const latencyMs = Date.now() - startedAt;
      return NextResponse.json({
        text: result.text,
        model: OPENAI_MODEL_4O,
        latencyMs,
        costUsd: result.costUsd,
      });
    }

    if (provider === "openai-gpt-4o-mini") {
      const result = await translateOpenAI(
        systemPrompt,
        text,
        OPENAI_MODEL_4O_MINI
      );
      const latencyMs = Date.now() - startedAt;
      return NextResponse.json({
        text: result.text,
        model: OPENAI_MODEL_4O_MINI,
        latencyMs,
        costUsd: result.costUsd,
      });
    }

    if (provider === "claude-sonnet") {
      const result = await translateClaude(
        systemPrompt,
        text,
        CLAUDE_MODEL_SONNET
      );
      const latencyMs = Date.now() - startedAt;
      return NextResponse.json({
        text: result.text,
        model: CLAUDE_MODEL_SONNET,
        latencyMs,
        costUsd: result.costUsd,
      });
    }

    if (provider === "claude-haiku") {
      const result = await translateClaude(
        systemPrompt,
        text,
        CLAUDE_MODEL_HAIKU
      );
      const latencyMs = Date.now() - startedAt;
      return NextResponse.json({
        text: result.text,
        model: CLAUDE_MODEL_HAIKU,
        latencyMs,
        costUsd: result.costUsd,
      });
    }

    if (provider === "gemini-pro") {
      const result = await translateGemini(
        systemPrompt,
        text,
        GEMINI_MODEL_PRO
      );
      const latencyMs = Date.now() - startedAt;
      return NextResponse.json({
        text: result.text,
        model: GEMINI_MODEL_PRO,
        latencyMs,
        costUsd: result.costUsd,
      });
    }

    const result = await translateGemini(
      systemPrompt,
      text,
      GEMINI_MODEL_FLASH
    );
    const latencyMs = Date.now() - startedAt;
    return NextResponse.json({
      text: result.text,
      model: GEMINI_MODEL_FLASH,
      latencyMs,
      costUsd: result.costUsd,
    });
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
  userMessage: string,
  model: string
): Promise<{ text: string; costUsd?: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (content == null) throw new Error("Empty OpenAI response");
  const text = normalizeTranslationOutput(content);

  const usage = completion.usage;
  let costUsd: number | undefined;
  if (usage) {
    const input = usage.prompt_tokens ?? 0;
    const output = usage.completion_tokens ?? 0;
    // Rough pricing assumptions per 1K tokens.
    const inputRate =
      model === OPENAI_MODEL_4O ? 0.005 : 0.0005; // 4o vs 4o-mini
    const outputRate =
      model === OPENAI_MODEL_4O ? 0.015 : 0.0015; // 4o vs 4o-mini
    costUsd =
      (input * inputRate) / 1000 +
      (output * outputRate) / 1000;
  }

  return { text, costUsd };
}

async function translateClaude(
  systemPrompt: string,
  userMessage: string,
  model: string
): Promise<{ text: string; costUsd?: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const block = message.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  if (!text) throw new Error("Empty Claude response");
  const normalized = normalizeTranslationOutput(text);

  const usage = (message as any).usage as
    | { input_tokens?: number; output_tokens?: number }
    | undefined;
  let costUsd: number | undefined;
  if (usage) {
    const input = usage.input_tokens ?? 0;
    const output = usage.output_tokens ?? 0;
    // Rough pricing assumptions per 1K tokens.
    const inputRate =
      model === CLAUDE_MODEL_SONNET ? 0.003 : 0.00025;
    const outputRate =
      model === CLAUDE_MODEL_SONNET ? 0.015 : 0.00125;
    costUsd =
      (input * inputRate) / 1000 +
      (output * outputRate) / 1000;
  }

  return { text: normalized, costUsd };
}

async function translateGemini(
  systemPrompt: string,
  userMessage: string,
  modelName: string
): Promise<{ text: string; costUsd?: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
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
  const text = normalizeTranslationOutput(content);

  const usage = response.usageMetadata as
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined;
  let costUsd: number | undefined;
  if (usage) {
    const input = usage.promptTokenCount ?? 0;
    const output = usage.candidatesTokenCount ?? 0;
    // Rough pricing assumptions per 1K tokens.
    const inputRate =
      modelName === GEMINI_MODEL_PRO ? 0.0025 : 0.0001;
    const outputRate =
      modelName === GEMINI_MODEL_PRO ? 0.0075 : 0.0004;
    costUsd =
      (input * inputRate) / 1000 +
      (output * outputRate) / 1000;
  }

  return { text, costUsd };
}
