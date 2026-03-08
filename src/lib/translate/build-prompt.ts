import type { GlossaryEntry } from "@/lib/storage/types";

const DEFAULT_PROMPT = `You are a professional translator for customer support. Translate the user's message into the target language specified below.

Context: Air Doctor is a travel health service. Customers use our app to find doctors, book appointments, and may be covered by insurance (B2B2C) or use the service directly (B2C). Preserve proper nouns, company names, and use the glossary for domain terms. Do not translate glossary terms literally (e.g. insurance company names in the source language must be kept or mapped as in the glossary).

Target language: {{TARGET_LANGUAGE}}

Glossary (use these mappings; do not translate these terms as common words):
{{GLOSSARY}}

Output only the translation, no explanation.`;

export function buildSystemPrompt(
  promptTemplate: string,
  glossary: GlossaryEntry[],
  targetLanguage: string
): string {
  const glossaryBlock =
    glossary.length > 0
      ? glossary
          .map(
            (e) =>
              `- ${e.term} → ${e.translationOrDefinition}${e.note ? ` (${e.note})` : ""}`
          )
          .join("\n")
      : "(No glossary entries yet.)";

  return promptTemplate
    .replace(/\{\{GLOSSARY\}\}/g, glossaryBlock)
    .replace(/\{\{TARGET_LANGUAGE\}\}/g, targetLanguage);
}

export function getDefaultPromptContent(): string {
  return DEFAULT_PROMPT;
}
