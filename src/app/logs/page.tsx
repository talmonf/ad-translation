"use client";

import { useEffect, useState } from "react";

interface ProviderResultSnapshot {
  provider:
    | "openai-gpt-4o"
    | "openai-gpt-4o-mini"
    | "claude-sonnet"
    | "claude-haiku"
    | "gemini-pro"
    | "gemini-flash";
  model?: string;
  text?: string;
  error?: string;
  score?: number;
  comment?: string;
  latencyMs?: number;
  costUsd?: number;
}

interface TranslationLog {
  id: string;
  createdAt: string;
  text: string;
  targetLanguage: string;
  promptContent: string;
  glossarySnapshot: {
    term: string;
    translationOrDefinition: string;
    note?: string;
  }[];
  providerResults: ProviderResultSnapshot[];
  promptVersionId?: string;
  glossaryVersionId?: string;
  promptProposal?: {
    fullText: string;
    rationale?: string;
  } | null;
  glossaryProposal?: {
    additions: {
      term: string;
      translationOrDefinition: string;
      note?: string;
    }[];
    updates: {
      term: string;
      translationOrDefinition: string;
      note?: string;
    }[];
    removals: string[];
    rationale?: string;
  } | null;
  appliedAt?: string;
  applyAction?: "apply-only" | "apply-and-retranslate";
}

export default function LogsPage() {
  const [logs, setLogs] = useState<TranslationLog[]>([]);
  const [selected, setSelected] = useState<TranslationLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/logs");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load logs");
        }
        if (!cancelled) {
          const list: TranslationLog[] = Array.isArray(data) ? data : [];
          setLogs(list);
          setSelected(list[0] ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-gray-500">Loading translation logs…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Translation logs</h1>
      <p className="text-gray-600 mb-4">
        Browse past translation sessions, feedback, and proposed prompt/glossary
        changes.
      </p>
      {logs.length === 0 ? (
        <p className="text-gray-500 text-sm">No logs recorded yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="md:col-span-1 border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-3 py-2">
              <h2 className="text-sm font-medium text-gray-800">Sessions</h2>
            </div>
            <ul className="max-h-[28rem] overflow-auto divide-y divide-gray-100">
              {logs.map((log) => {
                const created = new Date(log.createdAt);
                const summaryScores = log.providerResults
                  .filter((r) => typeof r.score === "number")
                  .map((r) => `${r.provider}: ${r.score}`)
                  .join(" · ");
                const isSelected = selected?.id === log.id;
                return (
                  <li
                    key={log.id}
                    className={`px-3 py-2 text-sm cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-800"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelected(log)}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium truncate">
                          {log.text.length > 40
                            ? `${log.text.slice(0, 40)}…`
                            : log.text || "(empty input)"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {created.toLocaleString()} · {log.targetLanguage}
                        </p>
                        {summaryScores && (
                          <p className="text-xs text-gray-500">
                            {summaryScores}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="md:col-span-2 border border-gray-200 rounded-lg bg-white p-4 max-h-[32rem] overflow-auto">
            {selected ? (
              <LogDetail log={selected} />
            ) : (
              <p className="text-gray-500 text-sm">
                Select a session on the left to inspect its details.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function LogDetail({ log }: { log: TranslationLog }) {
  const created = new Date(log.createdAt);
  return (
    <div className="space-y-4 text-sm">
      <header>
        <h2 className="text-lg font-medium mb-1">Session details</h2>
        <p className="text-xs text-gray-500">
          {created.toLocaleString()} · Target language: {log.targetLanguage}
        </p>
        {log.appliedAt && (
          <p className="text-xs text-green-700 mt-1">
            Changes applied at {new Date(log.appliedAt).toLocaleString()}
            {log.applyAction
              ? ` (${log.applyAction === "apply-and-retranslate" ? "applied and re-translated" : "applied only"})`
              : ""}
            .
          </p>
        )}
      </header>

      <section>
        <h3 className="font-medium mb-1">Input text</h3>
        <p className="whitespace-pre-wrap text-gray-800">{log.text}</p>
      </section>

      <section>
        <h3 className="font-medium mb-1">Provider results</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {log.providerResults.map((r) => (
            <div
              key={r.provider}
              className="border border-gray-200 rounded-md p-2 bg-gray-50"
            >
              <p className="font-medium mb-0.5">{r.provider}</p>
              {r.model && (
                <p className="text-xs text-gray-500 mb-1">Model: {r.model}</p>
              )}
              {(typeof r.latencyMs === "number" || typeof r.costUsd === "number") && (
                <p className="text-[11px] text-gray-500 mb-1">
                  {typeof r.latencyMs === "number" && `Latency: ${Math.round(r.latencyMs)} ms`}
                  {typeof r.latencyMs === "number" && typeof r.costUsd === "number" && " • "}
                  {typeof r.costUsd === "number" && `Cost: $${r.costUsd.toFixed(4)}`}
                </p>
              )}
              {typeof r.score === "number" && (
                <p className="text-xs text-gray-700 mb-1">
                  Score: {r.score}
                  {r.comment ? ` – ${r.comment}` : ""}
                </p>
              )}
              {r.error ? (
                <p className="text-xs text-red-600 whitespace-pre-wrap max-h-32 overflow-auto">
                  {r.error}
                </p>
              ) : (
                <p className="text-xs text-gray-800 whitespace-pre-wrap max-h-32 overflow-auto">
                  {r.text}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-medium mb-1">Prompt</h3>
        <p className="text-xs text-gray-500 mb-1">
          Prompt used at the time of this session.
          {log.promptVersionId && (
            <>
              {" "}
              Linked prompt version: <code>{log.promptVersionId}</code>
            </>
          )}
        </p>
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-2 whitespace-pre-wrap max-h-40 overflow-auto">
          {log.promptContent}
        </pre>
      </section>

      <section>
        <h3 className="font-medium mb-1">Glossary snapshot</h3>
        <p className="text-xs text-gray-500 mb-1">
          Glossary entries at the time of this session.
          {log.glossaryVersionId && (
            <>
              {" "}
              Linked glossary version: <code>{log.glossaryVersionId}</code>
            </>
          )}
        </p>
        {log.glossarySnapshot.length === 0 ? (
          <p className="text-xs text-gray-500">No glossary entries.</p>
        ) : (
          <table className="w-full text-xs border border-gray-200 rounded-md overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-2 py-1 font-medium">Term</th>
                <th className="text-left px-2 py-1 font-medium">
                  Translation / definition
                </th>
                <th className="text-left px-2 py-1 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {log.glossarySnapshot.map((e) => (
                <tr key={e.term} className="border-t border-gray-200">
                  <td className="px-2 py-1">{e.term}</td>
                  <td className="px-2 py-1">{e.translationOrDefinition}</td>
                  <td className="px-2 py-1 text-gray-500">
                    {e.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {log.promptProposal && (
        <section>
          <h3 className="font-medium mb-1">Prompt proposal</h3>
          {log.promptProposal.rationale && (
            <p className="text-xs text-gray-500 mb-1">
              {log.promptProposal.rationale}
            </p>
          )}
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-md p-2 whitespace-pre-wrap max-h-40 overflow-auto">
            {log.promptProposal.fullText}
          </pre>
        </section>
      )}

      {log.glossaryProposal && (
        <section>
          <h3 className="font-medium mb-1">Glossary proposal</h3>
          {log.glossaryProposal.rationale && (
            <p className="text-xs text-gray-500 mb-1">
              {log.glossaryProposal.rationale}
            </p>
          )}
          <div className="space-y-2">
            {log.glossaryProposal.additions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-0.5">
                  Additions
                </p>
                <ul className="list-disc list-inside text-xs text-gray-800">
                  {log.glossaryProposal.additions.map((e) => (
                    <li key={`add-${e.term}`}>
                      <span className="font-medium">{e.term}</span> →{" "}
                      {e.translationOrDefinition}
                      {e.note ? ` – ${e.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {log.glossaryProposal.updates.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-0.5">
                  Updates
                </p>
                <ul className="list-disc list-inside text-xs text-gray-800">
                  {log.glossaryProposal.updates.map((e) => (
                    <li key={`upd-${e.term}`}>
                      <span className="font-medium">{e.term}</span> →{" "}
                      {e.translationOrDefinition}
                      {e.note ? ` – ${e.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {log.glossaryProposal.removals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-0.5">
                  Removals
                </p>
                <ul className="list-disc list-inside text-xs text-gray-800">
                  {log.glossaryProposal.removals.map((term) => (
                    <li key={`rem-${term}`}>{term}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

