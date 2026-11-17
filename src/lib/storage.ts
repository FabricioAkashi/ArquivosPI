import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put, del, list } from "@vercel/blob";
import { Database, FileItem, Semester } from "./types";
import { getExtension, getFileCategory, getMimeFromExtension, slugify } from "./file-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const BLOB_DB_KEY = "acervo-meta/db.json";

export function isCloudStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function getDefaultDb(): Database {
  return {
    semesters: [
      {
        id: "2026-2",
        name: "2026.2",
        title: "Projeto Integrador",
        description: "Arquivos, slides e documentação da apresentação final.",
        createdAt: new Date().toISOString(),
      },
    ],
    files: [],
  };
}

let dbQueue: Promise<unknown> = Promise.resolve();

function withDbLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = dbQueue.then(fn, fn);
  dbQueue = next.catch(() => {});
  return next;
}

async function ensureLocalDirs(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function readDb(): Promise<Database> {
  if (isCloudStorageEnabled()) {
    try {
      const { blobs } = await list({ prefix: BLOB_DB_KEY, limit: 1 });
      const metaBlob = blobs.find((b) => b.pathname === BLOB_DB_KEY);
      if (!metaBlob) {
        const initial = getDefaultDb();
        await writeDb(initial);
        return initial;
      }
      const res = await fetch(`${metaBlob.url}?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        return getDefaultDb();
      }
      const parsed = (await res.json()) as Database;
      return {
        semesters: Array.isArray(parsed.semesters) ? parsed.semesters : [],
        files: Array.isArray(parsed.files) ? parsed.files : [],
      };
    } catch {
      return getDefaultDb();
    }
  }

  await ensureLocalDirs();
  try {
    const raw = await fs.readFile(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Database;
    return {
      semesters: Array.isArray(parsed.semesters) ? parsed.semesters : [],
      files: Array.isArray(parsed.files) ? parsed.files : [],
    };
  } catch {
    const initial = getDefaultDb();
    await writeDb(initial);
    return initial;
  }
}

export async function writeDb(db: Database): Promise<void> {
  const payload = JSON.stringify(db, null, 2);

  if (isCloudStorageEnabled()) {
    await put(BLOB_DB_KEY, payload, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  await ensureLocalDirs();
  const tempFile = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempFile, payload, "utf-8");
  await fs.rename(tempFile, DB_FILE);
}

export async function createSemester(input: {
  name: string;
  title: string;
  description?: string;
}): Promise<Semester> {
  return withDbLock(async () => {
    const db = await readDb();
    const baseId = slugify(input.name) || crypto.randomUUID().slice(0, 8);
    let id = baseId;
    let suffix = 2;
    while (db.semesters.some((s) => s.id === id)) {
      id = `${baseId}-${suffix++}`;
    }

    const semester: Semester = {
      id,
      name: input.name.trim(),
      title: input.title.trim() || input.name.trim(),
      description: input.description?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    db.semesters.unshift(semester);
    await writeDb(db);
    return semester;
  });
}

export async function updateSemester(
  id: string,
  updates: { name?: string; title?: string; description?: string }
): Promise<Semester | null> {
  return withDbLock(async () => {
    const db = await readDb();
    const idx = db.semesters.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    const current = db.semesters[idx];
    const updated: Semester = {
      ...current,
      name: updates.name !== undefined ? updates.name.trim() : current.name,
      title: updates.title !== undefined ? updates.title.trim() : current.title,
      description:
        updates.description !== undefined
          ? updates.description.trim() || undefined
          : current.description,
    };

    db.semesters[idx] = updated;
    await writeDb(db);
    return updated;
  });
}

export async function deleteSemester(id: string): Promise<boolean> {
  return withDbLock(async () => {
    const db = await readDb();
    const exists = db.semesters.some((s) => s.id === id);
    if (!exists) return false;

    const filesToDelete = db.files.filter((f) => f.semesterId === id);
    for (const file of filesToDelete) {
      await removeStoredFile(file.storageKey).catch(() => {});
    }

    db.semesters = db.semesters.filter((s) => s.id !== id);
    db.files = db.files.filter((f) => f.semesterId !== id);
    await writeDb(db);
    return true;
  });
}

export async function saveLocalFileAndRecord(params: {
  semesterId: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<FileItem> {
  return withDbLock(async () => {
    const db = await readDb();
    if (!db.semesters.some((s) => s.id === params.semesterId)) {
      throw new Error("Semestre não encontrado.");
    }

    const id = crypto.randomUUID().slice(0, 12);
    const safeName = path.basename(params.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const extension = getExtension(params.name);
    const mimeType = params.mimeType || getMimeFromExtension(extension);
    const category = getFileCategory(params.name, mimeType);

    let storageKey: string;
    let url: string;

    if (isCloudStorageEnabled()) {
      const blob = await put(`uploads/${params.semesterId}/${id}-${safeName}`, params.buffer, {
        access: "public",
        contentType: mimeType,
      });
      storageKey = blob.url;
      url = blob.url;
    } else {
      await ensureLocalDirs();
      storageKey = `${id}-${safeName}`;
      await fs.writeFile(path.join(UPLOADS_DIR, storageKey), params.buffer);
      url = `/api/files/${id}`;
    }

    const item: FileItem = {
      id,
      semesterId: params.semesterId,
      name: params.name,
      mimeType,
      size: params.buffer.length,
      extension,
      category,
      url,
      storageKey,
      createdAt: new Date().toISOString(),
    };

    db.files.unshift(item);
    await writeDb(db);
    return item;
  });
}

export async function registerCloudFileRecord(params: {
  semesterId: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}): Promise<FileItem> {
  return withDbLock(async () => {
    const db = await readDb();
    if (!db.semesters.some((s) => s.id === params.semesterId)) {
      throw new Error("Semestre não encontrado.");
    }

    const id = crypto.randomUUID().slice(0, 12);
    const extension = getExtension(params.name);
    const mimeType = params.mimeType || getMimeFromExtension(extension);
    const category = getFileCategory(params.name, mimeType);

    const item: FileItem = {
      id,
      semesterId: params.semesterId,
      name: params.name,
      mimeType,
      size: params.size,
      extension,
      category,
      url: params.url,
      storageKey: params.url,
      createdAt: new Date().toISOString(),
    };

    db.files.unshift(item);
    await writeDb(db);
    return item;
  });
}

export async function deleteFileRecord(fileId: string): Promise<boolean> {
  return withDbLock(async () => {
    const db = await readDb();
    const target = db.files.find((f) => f.id === fileId);
    if (!target) return false;

    await removeStoredFile(target.storageKey).catch(() => {});
    db.files = db.files.filter((f) => f.id !== fileId);
    await writeDb(db);
    return true;
  });
}

async function removeStoredFile(storageKey: string): Promise<void> {
  if (!storageKey) return;
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    if (isCloudStorageEnabled()) {
      await del(storageKey);
    }
    return;
  }
  const safePath = resolveLocalUploadPath(storageKey);
  if (safePath) {
    await fs.unlink(safePath).catch(() => {});
  }
}

export function resolveLocalUploadPath(storageKey: string): string | null {
  const base = path.resolve(UPLOADS_DIR);
  const target = path.resolve(UPLOADS_DIR, path.basename(storageKey));
  if (!target.startsWith(base + path.sep) && target !== base) {
    return null;
  }
  return target;
}

export async function getFileById(fileId: string): Promise<FileItem | null> {
  const db = await readDb();
  return db.files.find((f) => f.id === fileId) || null;
}
