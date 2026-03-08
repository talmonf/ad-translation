"use client";

import { useCallback, useEffect, useState } from "react";

interface PromptRecord {
  content: string;
}

interface GlossaryEntry {
  term: string;
  translationOrDefinition: string;
  note?: string;
}

export default function ExportPage() {
  const [promptContent, setPromptContent] = useState<string>("");
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"prompt" | "glossary" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [promptRes, glossaryRes] = await Promise.all([
        fetch("/api/prompt"),
        fetch("/api/glossary"),
      ]);
      const promptData = await promptRes.json();
      const glossaryData = await glossaryRes.json();
      if (promptRes.ok) setPromptContent(promptData.content ?? "");
      if (glossaryRes.ok) setGlossary(Array.isArray(glossaryData) ? glossaryData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const glossaryBlock =
    glossary.length > 0
      ? glossary
          .map(
            (e) =>
              `- ${e.term} → ${e.translationOrDefinition}${e.note ? ` (${e.note})` : ""}`
          )
          .join("\n")
      : "(No glossary entries)";

  const promptWithGlossary = promptContent
    .replace(/\{\{GLOSSARY\}\}/g, glossaryBlock)
    .replace(/\{\{TARGET_LANGUAGE\}\}/g, "English");

  async function copyPrompt() {
    await navigator.clipboard.writeText(promptWithGlossary);
    setCopied("prompt");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyGlossary() {
    await navigator.clipboard.writeText(JSON.stringify(glossary, null, 2));
    setCopied("glossary");
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadPrompt() {
    const blob = new Blob([promptWithGlossary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translation-prompt.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadGlossary() {
    const blob = new Blob([JSON.stringify(glossary, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translation-glossary.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Export for production</h1>
      <p className="text-gray-600 mb-6">
        Download or copy the prompt and glossary to use in your customer support app.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-medium mb-2">System prompt (with glossary injected)</h2>
        <div className="flex gap-2 mb-2">
          <button
            onClick={copyPrompt}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {copied === "prompt" ? "Copied" : "Copy to clipboard"}
          </button>
          <button
            onClick={downloadPrompt}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Download .txt
          </button>
        </div>
        <pre className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm overflow-auto max-h-80">
          {promptWithGlossary}
        </pre>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Glossary</h2>
        <div className="flex gap-2 mb-2">
          <button
            onClick={copyGlossary}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {copied === "glossary" ? "Copied" : "Copy to clipboard"}
          </button>
          <button
            onClick={downloadGlossary}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Download .json
          </button>
        </div>
        <pre className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm overflow-auto max-h-60">
          {JSON.stringify(glossary, null, 2)}
        </pre>
      </section>
    </main>
  );
}
