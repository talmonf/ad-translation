import OpenAI from "openai";
import type {
  GlossaryEntry,
  ProviderResultSnapshot,
} from "@/lib/storage/types";

export interface PromptProposal {
  fullText: string;
  rationale?: string;
}

export interface GlossaryProposal {
  additions: GlossaryEntry[];
  updates: GlossaryEntry[];
  removals: string[];
  rationale?: string;
}

export interface SuggestImprovementsInput {
  text: string;
  targetLanguage: string;
  promptContent: string;
  glossary: GlossaryEntry[];
  providerResults: ProviderResultSnapshot[];
}

export interface SuggestImprovementsResult {
  promptProposal: PromptProposal | null;
  glossaryProposal: GlossaryProposal | null;
}

export async function suggestImprovements(
  input: SuggestImprovementsInput
): Promise<SuggestImprovementsResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { promptProposal: null, glossaryProposal: null };
  }

  const openai = new OpenAI({ apiKey });

  const system = [
    "You are helping improve a translation system used by Air Doctor customer support agents.",
    "You receive:",
    "- The current translation prompt.",
    "- The current glossary (terms and their meanings).",
    "- The original customer message and target language.",
    "- The translations produced by several models (OpenAI, Claude, Gemini).",
    "- Human scores (1-5) and comments about why translations are not perfect.",
    "",
    "Your goal is to propose improvements to the prompt and glossary that will reduce future errors.",
    "",
    "IMPORTANT:",
    "- Respond ONLY with valid JSON.",
    "- Do not include any prose outside the JSON.",
    "- JSON shape:",
    "{",
    '  "promptProposal": {',
    '    "fullText": string,',
    '    "rationale": string',
    "  } | null,",
    '  "glossaryProposal": {',
    '    "additions": { "term": string, "translationOrDefinition": string, "note"?: string }[],',
    '    "updates": { "term": string, "translationOrDefinition": string, "note"?: string }[],',
    '    "removals": string[],',
    '    "rationale": string',
    "  } | null",
    "}",
  ].join("\n");

  const user = {
    text: input.text,
    targetLanguage: input.targetLanguage,
    promptContent: input.promptContent,
    glossary: input.glossary,
    providerResults: input.providerResults,
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify(user),
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { promptProposal: null, glossaryProposal: null };
    }

    const parsed = JSON.parse(content as string);

    return {
      promptProposal: parsed.promptProposal ?? null,
      glossaryProposal: parsed.glossaryProposal ?? null,
    };
  } catch {
    return { promptProposal: null, glossaryProposal: null };
  }
}

