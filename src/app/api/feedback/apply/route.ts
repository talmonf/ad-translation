import {
  addGlossaryVersion,
  addPromptVersion,
  getGlossary,
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
  promptProposal?: {
    fullText: string;
    rationale?: string;
  } | null;
  glossaryProposal?: {
    additions: GlossaryEntry[];
    updates: GlossaryEntry[];
    removals: string[];
    rationale?: string;
  } | null;
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

    // Best-effort: try to find the log, but don't fail hard if it is missing.
    const log = await getLogById(logId).catch(() => null);

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
    const promptTextFromProposal =
      body.promptProposal?.fullText?.trim() ??
      log?.promptProposal?.fullText?.trim();
    const nextPromptText = promptTextFromBody || promptTextFromProposal;

    if (nextPromptText) {
      const record = await setPrompt(nextPromptText);
      const version = await addPromptVersion(
        nextPromptText,
        `From feedback ${logId}`
      );
      promptVersionId = version.id;
      // keep record.id implicit; consumers use current prompt content
    }

    // Apply glossary changes if a proposal exists (from body or log)
    const proposalFromBody = body.glossaryProposal;
    const proposalFromLog = log?.glossaryProposal ?? null;
    const glossaryProposal = proposalFromBody ?? proposalFromLog;

    if (glossaryProposal) {
      const base: GlossaryEntry[] = log?.glossarySnapshot?.length
        ? [...log.glossarySnapshot]
        : await getGlossary();
      const { additions, updates, removals } = glossaryProposal;

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
        `From feedback ${logId}`
      );
      glossaryVersionId = gv.id;
    }

    const appliedAt = new Date().toISOString();

    if (log) {
      await updateLog(log.id, {
        promptVersionId,
        glossaryVersionId,
        appliedAt,
        applyAction,
      });
    }

    return NextResponse.json({
      logId,
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

