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

export interface Example {
  id: string;
  sourcePhrase: string;
  correctTranslation: string;
  explanation: string;
}
