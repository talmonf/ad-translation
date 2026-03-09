"use client";

import { useState } from "react";

const TARGET_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Hebrew",
  "Portuguese",
];

type Result = { text?: string; error?: string };

export default function ComparePage() {
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    openai?: Result;
    claude?: Result;
    gemini?: Result;
  } | null>(null);

  async function handleTranslate() {
    if (!text.trim()) return;
    const payload = { text: text.trim(), targetLanguage };
    setLoading(true);
    setResults({
      openai: undefined,
      claude: undefined,
      gemini: undefined,
    });

    const run = async (provider: "openai" | "claude" | "gemini") => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, provider }),
        });
        const data = await res.json();
        if (!res.ok) {
          setResults((prev) => ({
            ...prev,
            [provider]: { error: data.error || res.statusText },
          }));
          return;
        }
        setResults((prev) => ({
          ...prev,
          [provider]: { text: data.text },
        }));
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [provider]: { error: String(err) },
        }));
      }
    };

    await Promise.all([run("openai"), run("claude"), run("gemini")]);
    setLoading(false);
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">
        Translation Comparison
      </h1>
      <p className="text-gray-600 mb-6">
        Enter text to translate and compare results from OpenAI, Claude, and
        Gemini.
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target language
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 bg-white"
          >
            {TARGET_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text to translate
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the customer message here..."
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <button
          onClick={handleTranslate}
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Translating…" : "Translate"}
        </button>
      </div>

      {(results || loading) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResultPanel
            title="OpenAI"
            result={results?.openai}
            loading={loading && results?.openai === undefined}
          />
          <ResultPanel
            title="Claude"
            result={results?.claude}
            loading={loading && results?.claude === undefined}
          />
          <ResultPanel
            title="Gemini"
            result={results?.gemini}
            loading={loading && results?.gemini === undefined}
          />
        </div>
      )}
    </main>
  );
}

function ResultPanel({
  title,
  result,
  loading,
}: {
  title: string;
  result?: Result;
  loading: boolean;
}) {
  const hasError = !!result?.error;

  return (
    <div className="relative border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <h2 className="font-medium text-gray-900 mb-2">{title}</h2>
      {hasError && (
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(result?.error ?? "")
          }
          className="absolute top-3 right-3 text-xs text-gray-400 hover:text-gray-700"
          aria-label="Copy error message"
        >
          Copy
        </button>
      )}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : result?.error ? (
        <p className="text-red-600 text-xs whitespace-pre-wrap break-words max-h-64 overflow-auto">
          {result.error}
        </p>
      ) : result?.text != null ? (
        <p className="text-gray-800 whitespace-pre-wrap">{result.text}</p>
      ) : null}
    </div>
  );
}
