"use client";

import JSZip from "jszip";
import { FileItem, Folder } from "./types";
import { slugify } from "./file-utils";

/**
 * Empacota todos os arquivos de uma pasta (incluindo subpastas) em um .zip
 * no navegador usando JSZip e dispara o download.
 */
export async function downloadFolderAsZip(
  rootFolder: Folder,
  allFolders: Folder[],
  allFiles: FileItem[],
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const folderMap = new Map<string, Folder>();
  for (const f of allFolders) {
    folderMap.set(f.id, f);
  }

  // Coleta recursiva de subpastas dentro de rootFolder
  const collectedIds = new Set<string>([rootFolder.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of allFolders) {
      if (f.parentId && collectedIds.has(f.parentId) && !collectedIds.has(f.id)) {
        collectedIds.add(f.id);
        changed = true;
      }
    }
  }

  const targetFiles = allFiles.filter(
    (file) => Boolean(file.folderId) && collectedIds.has(file.folderId!)
  );

  if (targetFiles.length === 0) {
    return 0;
  }

  const getRelativeFolderPath = (folderId: string): string => {
    const segments: string[] = [];
    let currId: string | null | undefined = folderId;
    while (currId && currId !== rootFolder.id) {
      const f = folderMap.get(currId);
      if (!f) break;
      segments.unshift(f.name);
      currId = f.parentId;
    }
    return segments.join("/");
  };

  const zip = new JSZip();
  const usedPaths = new Set<string>();
  let completed = 0;

  for (const file of targetFiles) {
    onProgress?.(completed, targetFiles.length);
    const res = await fetch(file.url);
    if (!res.ok) continue;
    const blob = await res.blob();

    const relFolder = file.folderId ? getRelativeFolderPath(file.folderId) : "";
    let candidate = relFolder ? `${relFolder}/${file.name}` : file.name;
    let suffix = 2;
    while (usedPaths.has(candidate)) {
      const dotIdx = file.name.lastIndexOf(".");
      const uniqueName =
        dotIdx > 0
          ? `${file.name.slice(0, dotIdx)} (${suffix})${file.name.slice(dotIdx)}`
          : `${file.name} (${suffix})`;
      candidate = relFolder ? `${relFolder}/${uniqueName}` : uniqueName;
      suffix++;
    }
    usedPaths.add(candidate);
    zip.file(candidate, blob);
    completed++;
    onProgress?.(completed, targetFiles.length);
  }

  const archive = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(archive);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${slugify(rootFolder.name) || "pasta"}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

  return completed;
}
