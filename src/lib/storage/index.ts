import * as fs from "fs/promises";
import * as path from "path";
import { getBlob, setBlob } from "./blob";
import type { Example, GlossaryEntry, PromptRecord, PromptVersion } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

async function ensureDataDir(): Promise<void> {
  if (USE_BLOB) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(filename: string): Promise<T | null> {
  if (USE_BLOB) {
    const raw = await getBlob(filename);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  const body = JSON.stringify(data, null, 2);
  if (USE_BLOB) {
    await setBlob(filename, body);
    return;
  }
  await ensureDataDir();
  await fs.writeFile(path.join(DATA_DIR, filename), body, "utf-8");
}

// Prompt
export async function getPrompt(): Promise<PromptRecord | null> {
  return readJsonFile<PromptRecord>("prompt.json");
}

export async function setPrompt(content: string): Promise<PromptRecord> {
  const id = "current";
  const updatedAt = new Date().toISOString();
  const record: PromptRecord = { id, content, updatedAt };
  await writeJsonFile("prompt.json", record);
  return record;
}

// Prompt versions
export async function getPromptVersions(): Promise<PromptVersion[]> {
  const data = await readJsonFile<PromptVersion[]>("prompt-versions.json");
  return data ?? [];
}

export async function addPromptVersion(
  content: string,
  name?: string
): Promise<PromptVersion> {
  const versions = await getPromptVersions();
  const version: PromptVersion = {
    id: `v-${Date.now()}`,
    name: name ?? `Snapshot ${new Date().toLocaleString()}`,
    content,
    createdAt: new Date().toISOString(),
  };
  versions.unshift(version);
  await writeJsonFile("prompt-versions.json", versions.slice(0, 50));
  return version;
}

export async function deletePromptVersion(id: string): Promise<void> {
  const versions = (await getPromptVersions()).filter((v) => v.id !== id);
  await writeJsonFile("prompt-versions.json", versions);
}

// Glossary
export async function getGlossary(): Promise<GlossaryEntry[]> {
  const data = await readJsonFile<GlossaryEntry[]>("glossary.json");
  return data ?? [];
}

export async function setGlossary(entries: GlossaryEntry[]): Promise<void> {
  await writeJsonFile("glossary.json", entries);
}

// Examples
export async function getExamples(): Promise<Example[]> {
  const data = await readJsonFile<Example[]>("examples.json");
  return data ?? [];
}

export async function setExamples(examples: Example[]): Promise<void> {
  await writeJsonFile("examples.json", examples);
}

export async function addExample(
  example: Omit<Example, "id">
): Promise<Example> {
  const examples = await getExamples();
  const newExample: Example = {
    ...example,
    id: `ex-${Date.now()}`,
  };
  examples.push(newExample);
  await setExamples(examples);
  return newExample;
}

export async function updateExample(
  id: string,
  updates: Partial<Omit<Example, "id">>
): Promise<Example | null> {
  const examples = await getExamples();
  const idx = examples.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  examples[idx] = { ...examples[idx], ...updates };
  await setExamples(examples);
  return examples[idx] ?? null;
}

export async function deleteExample(id: string): Promise<boolean> {
  const examples = (await getExamples()).filter((e) => e.id !== id);
  if (examples.length === (await getExamples()).length) return false;
  await setExamples(examples);
  return true;
}
