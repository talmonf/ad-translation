import {
  addGlossaryVersion,
  addPromptVersion,
  getLogById,
  setGlossary,
  setPrompt,
  updateLog,
} from "@/lib/storage";
import type { GlossaryEntry, TranslationLog } from "@/lib/storage/types";
import { NextResponse } from "next/server";

interface ApplyFeedbackRequestBody {
  logId: string;
  promptFullText?: string | null;
  action?: TranslationLog["applyAction"];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ApplyFeedbackRequestBody;
    const logId = typeof body.logId === "string" ? body.logId.trim() : "";
    if (!logId) {
      return NextResponse.json(
        { error: "logId is required" },
        { status: 400 }
      );
    }

    const log = await getLogById(logId);
    if (!log) {
      return NextResponse.json(
        { error: "Log not found" },
        { status: 404 }
      );
    }

    const applyAction: TranslationLog["applyAction"] =
      body.action === "apply-and-retranslate" || body.action === "apply-only"
        ? body.action
        : "apply-only";

    let promptVersionId: string | undefined;
    let glossaryVersionId: string | undefined;

    // Apply prompt changes if available
    const promptTextFromBody =
      typeof body.promptFullText === "string"
        ? body.promptFullText.trim()
        : undefined;
    const promptTextFromProposal = log.promptProposal?.fullText?.trim();
    const nextPromptText = promptTextFromBody || promptTextFromProposal;

    if (nextPromptText) {
      const record = await setPrompt(nextPromptText);
      const version = await addPromptVersion(
        nextPromptText,
        `From feedback ${log.id}`
      );
      promptVersionId = version.id;
      // keep record.id implicit; consumers use current prompt content
    }

    // Apply glossary changes if a proposal exists
    if (log.glossarySnapshot && log.glossaryProposal) {
      const base: GlossaryEntry[] = Array.isArray(log.glossarySnapshot)
        ? [...log.glossarySnapshot]
        : [];
      const { additions, updates, removals } = log.glossaryProposal;

      let nextGlossary: GlossaryEntry[] = base;

      if (Array.isArray(removals) && removals.length > 0) {
        const toRemove = new Set(removals.map((t) => t.trim()));
        nextGlossary = nextGlossary.filter(
          (e) => !toRemove.has(e.term.trim())
        );
      }

      if (Array.isArray(updates) && updates.length > 0) {
        const byTerm = new Map(
          nextGlossary.map((e) => [e.term.trim(), e] as const)
        );
        for (const u of updates) {
          const term = u.term.trim();
          byTerm.set(term, {
            term,
            translationOrDefinition: u.translationOrDefinition.trim(),
            note: u.note?.trim() || undefined,
          });
        }
        nextGlossary = Array.from(byTerm.values());
      }

      if (Array.isArray(additions) && additions.length > 0) {
        const existingTerms = new Set(
          nextGlossary.map((e) => e.term.trim())
        );
        for (const a of additions) {
          const term = a.term.trim();
          if (!term || existingTerms.has(term)) continue;
          nextGlossary.push({
            term,
            translationOrDefinition: a.translationOrDefinition.trim(),
            note: a.note?.trim() || undefined,
          });
        }
      }

      await setGlossary(nextGlossary);
      const gv = await addGlossaryVersion(
        nextGlossary,
        `From feedback ${log.id}`
      );
      glossaryVersionId = gv.id;
    }

    const appliedAt = new Date().toISOString();
    await updateLog(log.id, {
      promptVersionId,
      glossaryVersionId,
      appliedAt,
      applyAction,
    });

    return NextResponse.json({
      logId: log.id,
      promptVersionId,
      glossaryVersionId,
      appliedAt,
      applyAction,
    });
  } catch (err) {
    console.error("Feedback apply API error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to apply feedback",
      },
      { status: 500 }
    );
  }
}

