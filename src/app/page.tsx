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

type ProviderId = "openai" | "claude" | "gemini";

type Result = {
  text?: string;
  error?: string;
  model?: string;
  score?: number;
  comment?: string;
};

type Evaluation = Pick<Result, "score" | "comment">;

type Proposals = {
  logId: string;
  prompt: {
    fullText: string;
    rationale?: string;
  } | null;
  glossary: {
    additions: unknown[];
    updates: unknown[];
    removals: string[];
    rationale?: string;
  } | null;
} | null;

export default function ComparePage() {
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposals>(null);
  const [results, setResults] = useState<{
    openai?: Result;
    claude?: Result;
    gemini?: Result;
  } | null>(null);

  async function handleTranslate() {
    if (!text.trim()) return;
    const payload = { text: text.trim(), targetLanguage };
    setProposals(null);
    setLoading(true);
    setResults({
      openai: undefined,
      claude: undefined,
      gemini: undefined,
    });

    const run = async (provider: ProviderId) => {
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
            [provider]: {
              error: data.error || res.statusText,
              model: data.model,
            },
          }));
          return;
        }
        setResults((prev) => ({
          ...prev,
          [provider]: { text: data.text, model: data.model },
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

  async function handleFeedbackSubmit() {
    if (!results || !text.trim()) return;
    // Require at least one score
    const anyScore =
      results.openai?.score ||
      results.claude?.score ||
      results.gemini?.score;
    if (!anyScore) {
      setFeedbackError("Please provide at least one score before submitting.");
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          targetLanguage,
          results,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      setProposals({
        logId: data.logId,
        prompt: data.promptProposal ?? null,
        glossary: data.glossaryProposal ?? null,
      });
    } catch (err) {
      setFeedbackError(String(err));
    } finally {
      setSubmittingFeedback(false);
    }
  }

  function handleEvaluationChange(
    provider: ProviderId,
    evaluation: Evaluation
  ) {
    setResults((prev) => {
      if (!prev) return prev;
      const current = prev[provider] ?? {};
      return {
        ...prev,
        [provider]: { ...current, ...evaluation },
      };
    });
  }

  const hasAnyScore =
    !!results?.openai?.score ||
    !!results?.claude?.score ||
    !!results?.gemini?.score;

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
            provider="openai"
            result={results?.openai}
            loading={loading && results?.openai === undefined}
            onEvaluationChange={handleEvaluationChange}
          />
          <ResultPanel
            title="Claude"
            provider="claude"
            result={results?.claude}
            loading={loading && results?.claude === undefined}
            onEvaluationChange={handleEvaluationChange}
          />
          <ResultPanel
            title="Gemini"
            provider="gemini"
            result={results?.gemini}
            loading={loading && results?.gemini === undefined}
            onEvaluationChange={handleEvaluationChange}
          />
        </div>
      )}

      {results && (
        <section className="mt-6 space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={submittingFeedback || !hasAnyScore}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingFeedback ? "Submitting feedback…" : "Submit Feedback"}
            </button>
            {!hasAnyScore && (
              <span className="text-xs text-gray-500">
                Provide at least one score to enable feedback submission.
              </span>
            )}
          </div>
          {feedbackError && (
            <p className="text-sm text-red-600 whitespace-pre-wrap">
              {feedbackError}
            </p>
          )}
        </section>
      )}

      {proposals && (
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold">Proposed changes</h2>
          {proposals.prompt && (
            <div>
              <h3 className="text-sm font-medium mb-1">Prompt proposal</h3>
              {proposals.prompt.rationale && (
                <p className="text-xs text-gray-500 mb-2">
                  {proposals.prompt.rationale}
                </p>
              )}
              <textarea
                value={proposals.prompt.fullText}
                onChange={(e) =>
                  setProposals((prev) =>
                    prev
                      ? {
                          ...prev,
                          prompt: {
                            ...prev.prompt!,
                            fullText: e.target.value,
                          },
                        }
                      : prev
                  )
                }
                rows={8}
                className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-xs"
              />
            </div>
          )}
          {proposals.glossary && (
            <div>
              <h3 className="text-sm font-medium mb-1">Glossary proposal</h3>
              {proposals.glossary.rationale && (
                <p className="text-xs text-gray-500 mb-2">
                  {proposals.glossary.rationale}
                </p>
              )}
              <p className="text-xs text-gray-600 mb-1">
                Detailed glossary editing will be available on the Glossary
                page. For now, proposed changes are listed in the Logs view and
                in this summary.
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function ResultPanel({
  title,
  provider,
  result,
  loading,
  onEvaluationChange,
}: {
  title: string;
  provider: ProviderId;
  result?: Result;
  loading: boolean;
  onEvaluationChange: (provider: ProviderId, evaluation: Evaluation) => void;
}) {
  const hasError = !!result?.error;

  function handleScoreChange(score: number) {
    onEvaluationChange(provider, {
      score,
      comment: result?.comment ?? "",
    });
  }

  function handleCommentChange(comment: string) {
    onEvaluationChange(provider, {
      score: result?.score,
      comment,
    });
  }

  return (
    <div className="relative border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <h2 className="font-medium text-gray-900 mb-1">{title}</h2>
      {result?.model && (
        <p className="text-xs text-gray-500 mb-2">Model: {result.model}</p>
      )}
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
      {!loading && (
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">
              Score (1–5)
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleScoreChange(v)}
                  className={`w-7 h-7 rounded-full border text-xs flex items-center justify-center ${
                    result?.score === v
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {result?.score && result.score < 5 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">
                Why is this not perfect?
              </p>
              <textarea
                value={result.comment ?? ""}
                onChange={(e) => handleCommentChange(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
