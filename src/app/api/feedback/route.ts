import { NextResponse } from "next/server";
import {
  addLog,
  getGlossary,
  getPrompt,
} from "@/lib/storage";
import type {
  GlossaryEntry,
  ProviderResultSnapshot,
  TranslationLog,
} from "@/lib/storage/types";
import {
  suggestImprovements,
  type SuggestImprovementsResult,
} from "@/lib/feedback/suggest-improvements";

interface FeedbackResultEntry {
  text?: string;
  error?: string;
  model?: string;
  score?: number;
  comment?: string;
  latencyMs?: number;
  costUsd?: number;
}

interface FeedbackRequestBody {
  text: string;
  targetLanguage: string;
  results: Record<string, FeedbackResultEntry | undefined>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackRequestBody;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const targetLanguage =
      typeof body.targetLanguage === "string" && body.targetLanguage.trim()
        ? body.targetLanguage.trim()
        : "";

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing text or targetLanguage" },
        { status: 400 }
      );
    }

    const [promptRecord, glossary] = await Promise.all([
      getPrompt(),
      getGlossary(),
    ]);
    const promptContent = promptRecord?.content ?? "";

    const providerResults: ProviderResultSnapshot[] = [];
    for (const [providerKey, data] of Object.entries(body.results ?? {})) {
      if (!data) continue;
      providerResults.push({
        provider: providerKey as ProviderResultSnapshot["provider"],
        model: data.model,
        text: data.text,
        error: data.error,
        score: data.score,
        comment: data.comment,
        latencyMs: data.latencyMs,
        costUsd: data.costUsd,
      });
    }

    let suggestions: SuggestImprovementsResult = {
      promptProposal: null,
      glossaryProposal: null,
    };

    try {
      suggestions = await suggestImprovements({
        text,
        targetLanguage,
        promptContent,
        glossary: glossary as GlossaryEntry[],
        providerResults,
      });
    } catch {
      // fall back to no suggestions
    }

    const log: TranslationLog = {
      id: `log-${Date.now()}`,
      createdAt: new Date().toISOString(),
      text,
      targetLanguage,
      promptContent,
      glossarySnapshot: glossary,
      providerResults,
      promptProposal: suggestions.promptProposal,
      glossaryProposal: suggestions.glossaryProposal,
    };

    await addLog(log);

    return NextResponse.json({
      logId: log.id,
      promptProposal: suggestions.promptProposal,
      glossaryProposal: suggestions.glossaryProposal,
    });
  } catch (err) {
    console.error("Feedback API error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to process feedback",
      },
      { status: 500 }
    );
  }
}

