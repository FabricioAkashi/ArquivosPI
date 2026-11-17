import React from "react";
import { isAdminAuthenticated, isUsingDefaultPin } from "@/lib/auth";
import { getBlobAccess, isCloudStorageEnabled, readDb } from "@/lib/storage";
import ShowcaseApp from "@/components/ShowcaseApp";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ s?: string; f?: string; d?: string; scope?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const [db, authenticated] = await Promise.all([
    readDb(),
    isAdminAuthenticated(),
  ]);

  let initialSemesterId = params.s;
  let initialFolderId = params.d;

  if (initialFolderId) {
    const matchedFolder = (db.folders || []).find((f) => f.id === initialFolderId);
    if (matchedFolder && !initialSemesterId) {
      initialSemesterId = matchedFolder.semesterId;
    }
  }

  if (!initialSemesterId && params.f) {
    const matchedFile = db.files.find((file) => file.id === params.f);
    if (matchedFile) {
      initialSemesterId = matchedFile.semesterId;
      if (!initialFolderId && matchedFile.folderId) {
        initialFolderId = matchedFile.folderId;
      }
    }
  }

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
