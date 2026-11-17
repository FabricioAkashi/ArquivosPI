import React from "react";
import { isAdminAuthenticated, isUsingDefaultPin } from "@/lib/auth";
import { getBlobAccess, isCloudStorageEnabled, readDb } from "@/lib/storage";
import ShowcaseApp from "@/components/ShowcaseApp";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ s?: string; f?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const [db, authenticated] = await Promise.all([
    readDb(),
    isAdminAuthenticated(),
  ]);

  let initialSemesterId = params.s;
  if (!initialSemesterId && params.f) {
    const matchedFile = db.files.find((file) => file.id === params.f);
    if (matchedFile) {
      initialSemesterId = matchedFile.semesterId;
    }
  }

  return (
    <ShowcaseApp
      initialSemesters={db.semesters}
      initialFiles={db.files}
      initialSemesterId={initialSemesterId}
      initialFileId={params.f}
      initialAuthenticated={authenticated}
      usingDefaultPin={isUsingDefaultPin()}
      storageMode={isCloudStorageEnabled() ? "cloud" : "local"}
      blobAccess={getBlobAccess()}
    />
  );
}
