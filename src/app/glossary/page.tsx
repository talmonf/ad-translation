"use client";

import { useCallback, useEffect, useState } from "react";

interface GlossaryEntry {
  term: string;
  translationOrDefinition: string;
  note?: string;
}

export default function GlossaryPage() {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [newTerm, setNewTerm] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newNote, setNewNote] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/glossary");
      const data = await res.json();
      if (res.ok) setEntries(Array.isArray(data) ? data : []);
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

  async function handleSaveAll() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setEntries(Array.isArray(data) ? data : entries);
      setMessage({ type: "ok", text: "Glossary saved." });
      setEditing(null);
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(index: number) {
    setEditing(index);
  }

  function handleUpdateEntry(
    index: number,
    field: keyof GlossaryEntry,
    value: string
  ) {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleDelete(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setEditing(null);
  }

  async function handleAdd() {
    if (!newTerm.trim() || !newTranslation.trim()) return;
    const newEntries = [
      ...entries,
      {
        term: newTerm.trim(),
        translationOrDefinition: newTranslation.trim(),
        note: newNote.trim() || undefined,
      },
    ];
    setEntries(newEntries);
    setNewTerm("");
    setNewTranslation("");
    setNewNote("");
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntries),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setEntries(Array.isArray(data) ? data : newEntries);
      setMessage({ type: "ok", text: "Entry added." });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-gray-500">Loading glossary…</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Glossary</h1>
      <p className="text-gray-600 mb-4">
        Terms and definitions injected into the translation prompt (e.g. insurance company names like מגדל → Migdal).
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

      <div className="border border-gray-200 rounded-lg p-4 bg-white mb-4">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Add entry</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <input
            type="text"
            placeholder="Term (e.g. מגדל)"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <input
            type="text"
            placeholder="Translation / definition"
            value={newTranslation}
            onChange={(e) => setNewTranslation(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !newTerm.trim() || !newTranslation.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="flex justify-end mb-2">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save all"}
        </button>
      </div>
      <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Term</th>
            <th className="text-left px-3 py-2 font-medium">Translation / definition</th>
            <th className="text-left px-3 py-2 font-medium">Note</th>
            <th className="w-24 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-t border-gray-200 bg-white">
              {editing === i ? (
                <>
                  <td className="px-3 py-2">
                    <input
                      value={e.term}
                      onChange={(ev) =>
                        handleUpdateEntry(i, "term", ev.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={e.translationOrDefinition}
                      onChange={(ev) =>
                        handleUpdateEntry(
                          i,
                          "translationOrDefinition",
                          ev.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={e.note ?? ""}
                      onChange={(ev) =>
                        handleUpdateEntry(i, "note", ev.target.value)
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-2">{e.term}</td>
                  <td className="px-3 py-2">{e.translationOrDefinition}</td>
                  <td className="px-3 py-2 text-gray-500 text-sm">
                    {e.note ?? "—"}
                  </td>
                </>
              )}
              <td className="px-3 py-2">
                {editing === i ? (
                  <button
                    onClick={() => setEditing(null)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Done
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(i)}
                      className="text-sm text-blue-600 hover:underline mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && (
        <p className="text-gray-500 text-sm mt-2">No entries. Add one above.</p>
      )}
    </main>
  );
}
