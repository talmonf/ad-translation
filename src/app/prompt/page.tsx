"use client";

import { useCallback, useEffect, useState } from "react";

interface PromptRecord {
  id: string;
  content: string;
  updatedAt: string | null;
}

interface PromptVersion {
  id: string;
  name?: string;
  content: string;
  createdAt: string;
}

export default function PromptPage() {
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveVersionName, setSaveVersionName] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadPrompt = useCallback(async () => {
    setLoading(true);
    try {
      const [promptRes, versionsRes] = await Promise.all([
        fetch("/api/prompt"),
        fetch("/api/prompt/versions"),
      ]);
      const promptData = await promptRes.json();
      const versionsData = await versionsRes.json();
      if (promptRes.ok) {
        setContent(promptData.content ?? "");
        setUpdatedAt(promptData.updatedAt ?? null);
      }
      if (versionsRes.ok) setVersions(Array.isArray(versionsData) ? versionsData : []);
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setMessage({ type: "ok", text: "Prompt saved." });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVersion() {
    if (!content.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/prompt/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          name: saveVersionName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save version");
      setVersions((prev) => [data, ...prev]);
      setSaveVersionName("");
      setMessage({ type: "ok", text: "Version saved." });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(version: PromptVersion) {
    setContent(version.content);
    setMessage({ type: "ok", text: "Restored to version. Click Save to set as current." });
  }

  async function handleDeleteVersion(id: string) {
    try {
      const res = await fetch(`/api/prompt/versions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setVersions((prev) => prev.filter((v) => v.id !== id));
      setMessage({ type: "ok", text: "Version deleted." });
    } catch (e) {
      setMessage({ type: "err", text: String(e) });
    }
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-gray-500">Loading prompt…</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Prompt</h1>
      <p className="text-gray-600 mb-4">
        System prompt for translation. Use <code className="bg-gray-100 px-1 rounded">{`{{GLOSSARY}}`}</code> and{" "}
        <code className="bg-gray-100 px-1 rounded">{`{{TARGET_LANGUAGE}}`}</code> for injection.
      </p>
      {updatedAt && (
        <p className="text-sm text-gray-500 mb-2">Last saved: {new Date(updatedAt).toLocaleString()}</p>
      )}
      {message && (
        <p
          className={`mb-2 text-sm ${
            message.type === "ok" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={18}
        className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
      />
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save current"}
        </button>
        <span className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Version name (optional)"
            value={saveVersionName}
            onChange={(e) => setSaveVersionName(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 w-48"
          />
          <button
            onClick={handleSaveVersion}
            disabled={saving || !content.trim()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            Save as version
          </button>
        </span>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium mb-2">Versions</h2>
        <ul className="space-y-2">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-white"
            >
              <div>
                <span className="font-medium">{v.name ?? v.id}</span>
                <span className="text-gray-500 text-sm ml-2">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(v)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Restore
                </button>
                <button
                  onClick={() => handleDeleteVersion(v.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {versions.length === 0 && (
            <li className="text-gray-500 text-sm">No versions yet. Save a version above.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
