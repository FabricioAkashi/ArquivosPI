import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put, del, get } from "@vercel/blob";
import { Database, FileItem, Folder, Semester } from "./types";
import { getExtension, getFileCategory, getMimeFromExtension, slugify } from "./file-utils";

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const BLOB_DB_KEY = "acervo-meta/db.json";

export type BlobAccess = "private" | "public";

let cachedBlobAccess: BlobAccess =
  process.env.BLOB_ACCESS === "public" ? "public" : "private";

export function isCloudStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function getBlobAccess(): BlobAccess {
  if (process.env.BLOB_ACCESS === "public") return "public";
  if (process.env.BLOB_ACCESS === "private") return "private";
  return cachedBlobAccess;
}

function flipBlobAccess(current: BlobAccess): BlobAccess {
  const next: BlobAccess = current === "private" ? "public" : "private";
  cachedBlobAccess = next;
  return next;
}

function isAccessMismatchError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("access") &&
    (msg.includes("public") || msg.includes("private"))
  );
}

async function withBlobAccessRetry<T>(
  fn: (access: BlobAccess) => Promise<T>
): Promise<T> {
  const first = getBlobAccess();
  try {
    return await fn(first);
  } catch (err) {
    if (!process.env.BLOB_ACCESS && isAccessMismatchError(err)) {
      const second = flipBlobAccess(first);
      return await fn(second);
    }
    throw err;
  }
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
    folders: [],
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
      const result = await withBlobAccessRetry((access) =>
        get(BLOB_DB_KEY, { access, useCache: false })
      );

      if (!result || result.statusCode !== 200 || !result.stream) {
        const initial = getDefaultDb();
        await writeDb(initial);
        return initial;
      }

      const text = await new Response(result.stream).text();
      const parsed = JSON.parse(text) as Database;
      return {
        semesters: Array.isArray(parsed.semesters) ? parsed.semesters : [],
        folders: Array.isArray(parsed.folders) ? parsed.folders : [],
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
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
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
    await withBlobAccessRetry((access) =>
      put(BLOB_DB_KEY, payload, {
        access,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      })
    );
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
    db.folders = (db.folders || []).filter((f) => f.semesterId !== id);
    db.files = db.files.filter((f) => f.semesterId !== id);
    await writeDb(db);
    return true;
  });
}

export async function createFolder(input: {
  semesterId: string;
  parentId?: string | null;
  name: string;
}): Promise<Folder> {
  return withDbLock(async () => {
    const db = await readDb();
    if (!db.semesters.some((s) => s.id === input.semesterId)) {
      throw new Error("Semestre não encontrado.");
    }

    const id = `fld-${crypto.randomUUID().slice(0, 8)}`;
    const folder: Folder = {
      id,
      semesterId: input.semesterId,
      parentId: input.parentId || null,
      name: input.name.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(db.folders)) {
      db.folders = [];
    }
    db.folders.push(folder);
    await writeDb(db);
    return folder;
  });
}

export async function updateFolder(
  id: string,
  updates: { name: string }
): Promise<Folder | null> {
  return withDbLock(async () => {
    const db = await readDb();
    if (!Array.isArray(db.folders)) return null;

    const idx = db.folders.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    const current = db.folders[idx];
    const updated: Folder = {
      ...current,
      name: updates.name.trim() || current.name,
    };

    db.folders[idx] = updated;
    await writeDb(db);
    return updated;
  });
}

export async function deleteFolder(id: string): Promise<boolean> {
  return withDbLock(async () => {
    const db = await readDb();
    const folders = db.folders || [];
    const target = folders.find((f) => f.id === id);
    if (!target) return false;

    // Achar todas as subpastas recursivamente
    const toDeleteFolderIds = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parentId && toDeleteFolderIds.has(f.parentId) && !toDeleteFolderIds.has(f.id)) {
          toDeleteFolderIds.add(f.id);
          added = true;
        }
      }
    }

    // Achar e deletar arquivos contidos nessas pastas
    const filesToDelete = db.files.filter((f) => f.folderId && toDeleteFolderIds.has(f.folderId));
    for (const file of filesToDelete) {
      await removeStoredFile(file.storageKey).catch(() => {});
    }

    db.folders = folders.filter((f) => !toDeleteFolderIds.has(f.id));
    db.files = db.files.filter((f) => !f.folderId || !toDeleteFolderIds.has(f.folderId));
    await writeDb(db);
    return true;
  });
}

export async function saveLocalFileAndRecord(params: {
  semesterId: string;
  folderId?: string | null;
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

    if (isCloudStorageEnabled()) {
      const blob = await withBlobAccessRetry((access) =>
        put(`uploads/${params.semesterId}/${id}-${safeName}`, params.buffer, {
          access,
          contentType: mimeType,
        })
      );
      storageKey = blob.url;
    } else {
      await ensureLocalDirs();
      storageKey = `${id}-${safeName}`;
      await fs.writeFile(path.join(UPLOADS_DIR, storageKey), params.buffer);
    }

    const item: FileItem = {
      id,
      semesterId: params.semesterId,
      folderId: params.folderId || null,
      name: params.name,
      mimeType,
      size: params.buffer.length,
      extension,
      category,
      url: `/api/files/${id}`,
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
  folderId?: string | null;
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
      folderId: params.folderId || null,
      name: params.name,
      mimeType,
      size: params.size,
      extension,
      category,
      url: `/api/files/${id}`,
      storageKey: params.url,
      createdAt: new Date().toISOString(),
    };

    db.files.unshift(item);
    await writeDb(db);
    return item;
  });
}

export async function getCloudFileStream(storageKey: string) {
  return withBlobAccessRetry((access) => get(storageKey, { access }));
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
