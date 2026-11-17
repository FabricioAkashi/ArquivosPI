import React from "react";
import { isAdminAuthenticated, isUsingDefaultPin } from "@/lib/auth";
import { getBlobAccess, isCloudStorageEnabled, readDb } from "@/lib/storage";
import { Database, Folder } from "@/lib/types";
import ShowcaseApp from "@/components/ShowcaseApp";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ s?: string; f?: string; d?: string; scope?: string }>;
}

function collectAllowedFolderIds(allFolders: Folder[], rootFolderId: string): Set<string> {
  const allowed = new Set<string>();
  const queue = [rootFolderId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (allowed.has(current)) continue;
    allowed.add(current);
    for (const fld of allFolders) {
      if (fld.parentId === current && !allowed.has(fld.id)) {
        queue.push(fld.id);
      }
    }
  }
  return allowed;
}

function filterDbForVisitorScope(
  db: Database,
  scope: string | undefined,
  semesterId: string | undefined,
  folderId: string | undefined
): Database {
  const allFolders = db.folders || [];

  if (scope === "folder" && folderId) {
    const targetFolder = allFolders.find((f) => f.id === folderId);
    if (!targetFolder) {
      return { semesters: [], folders: [], files: [] };
    }
    const allowedFolders = collectAllowedFolderIds(allFolders, folderId);
    return {
      semesters: db.semesters.filter((s) => s.id === targetFolder.semesterId),
      folders: allFolders.filter((f) => allowedFolders.has(f.id)),
      files: db.files.filter(
        (file) => Boolean(file.folderId) && allowedFolders.has(file.folderId!)
      ),
    };
  }

  if (scope === "semester" && semesterId) {
    return {
      semesters: db.semesters.filter((s) => s.id === semesterId),
      folders: allFolders.filter((f) => f.semesterId === semesterId),
      files: db.files.filter((file) => file.semesterId === semesterId),
    };
  }

  return db;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const [rawDb, authenticated] = await Promise.all([
    readDb(),
    isAdminAuthenticated(),
  ]);

  let initialSemesterId = params.s;
  let initialFolderId = params.d;

  if (initialFolderId) {
    const matchedFolder = (rawDb.folders || []).find((f) => f.id === initialFolderId);
    if (matchedFolder && !initialSemesterId) {
      initialSemesterId = matchedFolder.semesterId;
    }
  }

  if (!initialSemesterId && params.f) {
    const matchedFile = rawDb.files.find((file) => file.id === params.f);
    if (matchedFile) {
      initialSemesterId = matchedFile.semesterId;
      if (!initialFolderId && matchedFile.folderId) {
        initialFolderId = matchedFile.folderId;
      }
    }
  }

  // Isolamento real no servidor para visitantes não-admin em links com escopo restrito
  const db = authenticated
    ? rawDb
    : filterDbForVisitorScope(
        rawDb,
        params.scope,
        initialSemesterId,
        initialFolderId
      );

  return (
    <ShowcaseApp
      initialSemesters={db.semesters}
      initialFolders={db.folders || []}
      initialFiles={db.files}
      initialSemesterId={initialSemesterId}
      initialFolderId={initialFolderId}
      initialFileId={params.f}
      initialScope={params.scope as "all" | "semester" | "folder" | "file" | undefined}
      initialAuthenticated={authenticated}
      usingDefaultPin={isUsingDefaultPin()}
      storageMode={isCloudStorageEnabled() ? "cloud" : "local"}
      blobAccess={getBlobAccess()}
    />
  );
}
