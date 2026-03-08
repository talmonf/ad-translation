"use client";

import { useCallback, useEffect, useState } from "react";

interface Example {
  id: string;
  sourcePhrase: string;
  correctTranslation: string;
  explanation: string;
}

export default function ExamplesPage() {
  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sourcePhrase, setSourcePhrase] = useState("");
  const [correctTranslation, setCorrectTranslation] = useState("");
  const [explanation, setExplanation] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/examples");
      const data = await res.json();
      if (res.ok) setExamples(Array.isArray(data) ? data : []);
      else throw new Error(data.error || "Failed to load");
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!sourcePhrase.trim() || !correctTranslation.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePhrase: sourcePhrase.trim(),
          correctTranslation: correctTranslation.trim(),
          explanation: explanation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setExamples((prev) => [...prev, data]);
      setSourcePhrase("");
      setCorrectTranslation("");
      setExplanation("");
      setMessage({ type: "ok", text: "Example added." });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, updates: Partial<Example>) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/examples/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setExamples((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data } : e))
      );
      setEditingId(null);
      setMessage({ type: "ok", text: "Example updated." });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/examples/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setExamples((prev) => prev.filter((e) => e.id !== id));
      setEditingId(null);
      setMessage({ type: "ok", text: "Example deleted." });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-gray-500">Loading examples…</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Examples</h1>
      <p className="text-gray-600 mb-4">
        Correct translation examples to refine the prompt. Use these when editing the Prompt page.
      </p>
      {message && (
        <p
          className={`mb-2 text-sm ${
            message.type === "ok" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="border border-gray-200 rounded-lg p-4 bg-white mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Add example</h2>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Source phrase (original language)"
            value={sourcePhrase}
            onChange={(e) => setSourcePhrase(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          <input
            type="text"
            placeholder="Correct translation"
            value={correctTranslation}
            onChange={(e) => setCorrectTranslation(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          <input
            type="text"
            placeholder="Explanation (why this is correct)"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !sourcePhrase.trim() || !correctTranslation.trim()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <ul className="space-y-4">
        {examples.map((ex) => (
          <li
            key={ex.id}
            className="border border-gray-200 rounded-lg p-4 bg-white"
          >
            {editingId === ex.id ? (
              <EditForm
                example={ex}
                onSave={(updates) => handleUpdate(ex.id, updates)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <>
                <p className="font-medium text-gray-900">{ex.sourcePhrase}</p>
                <p className="text-gray-700 mt-1">→ {ex.correctTranslation}</p>
                {ex.explanation && (
                  <p className="text-sm text-gray-500 mt-1">{ex.explanation}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setEditingId(ex.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ex.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {examples.length === 0 && (
        <p className="text-gray-500 text-sm">No examples yet. Add one above.</p>
      )}
    </main>
  );
}

function EditForm({
  example,
  onSave,
  onCancel,
  saving,
}: {
  example: Example;
  onSave: (u: Partial<Example>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [sourcePhrase, setSourcePhrase] = useState(example.sourcePhrase);
  const [correctTranslation, setCorrectTranslation] = useState(
    example.correctTranslation
  );
  const [explanation, setExplanation] = useState(example.explanation);

  return (
    <div className="space-y-2">
      <input
        value={sourcePhrase}
        onChange={(e) => setSourcePhrase(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2"
        placeholder="Source phrase"
      />
      <input
        value={correctTranslation}
        onChange={(e) => setCorrectTranslation(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2"
        placeholder="Correct translation"
      />
      <input
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2"
        placeholder="Explanation"
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            onSave({ sourcePhrase, correctTranslation, explanation })
          }
          disabled={saving}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-200 rounded text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
