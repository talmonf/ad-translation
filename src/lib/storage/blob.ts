import { del, list, put } from "@vercel/blob";

const BLOB_PREFIX = "ad-translation/";

function fullPath(path: string): string {
  return `${BLOB_PREFIX}${path}`;
}

export async function getBlob(path: string): Promise<string | null> {
  try {
    const pathname = fullPath(path);
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const blob = blobs.find((b) => b.pathname === pathname);
    if (!blob?.url) return null;
    const res = await fetch(blob.url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function setBlob(path: string, body: string): Promise<void> {
  await put(fullPath(path), body, {
    access: "public",
    addRandomSuffix: false,
  });
}

export async function deleteBlob(path: string): Promise<void> {
  try {
    const pathname = fullPath(path);
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const blob = blobs.find((b) => b.pathname === pathname);
    if (blob?.url) await del(blob.url);
  } catch {
    // ignore
  }
}

export async function listBlobs(prefix: string): Promise<string[]> {
  const { blobs } = await list({ prefix: fullPath(prefix) });
  return blobs.map((b) => b.pathname.replace(BLOB_PREFIX, ""));
}
