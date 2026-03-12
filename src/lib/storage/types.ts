export interface PromptRecord {
  id: string;
  content: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  name?: string;
  content: string;
  createdAt: string;
}

export interface GlossaryEntry {
  term: string;
  translationOrDefinition: string;
  note?: string;
}

export interface GlossaryVersion {
  id: string;
  name?: string;
  entries: GlossaryEntry[];
  createdAt: string;
}

export interface Example {
  id: string;
  sourcePhrase: string;
  correctTranslation: string;
  explanation: string;
}

export type ProviderId =
  | "openai-gpt-4o"
  | "openai-gpt-4o-mini"
  | "claude-sonnet"
  | "claude-haiku"
  | "gemini-pro"
  | "gemini-flash";

export interface ProviderResultSnapshot {
  provider: ProviderId;
  model?: string;
  text?: string;
  error?: string;
  score?: number;
  comment?: string;
   latencyMs?: number;
   costUsd?: number;
}

export interface TranslationLog {
  id: string;
  createdAt: string;
  text: string;
  targetLanguage: string;
  promptContent: string;
  glossarySnapshot: GlossaryEntry[];
  providerResults: ProviderResultSnapshot[];
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
  promptVersionId?: string;
  glossaryVersionId?: string;
  appliedAt?: string;
  applyAction?: "apply-only" | "apply-and-retranslate";
}
