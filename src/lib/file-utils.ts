import { FileCategory } from "./types";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "ogg"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "m4a", "aac"]);
const TEXT_EXTS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "json5",
  "jsonc",
  "csv",
  "ts",
  "tsx",
  "mts",
  "cts",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "sql",
  "yaml",
  "yml",
  "xml",
  "log",
  "java",
  "c",
  "cpp",
  "h",
  "go",
  "rs",
  "sh",
]);

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

export function getFileCategory(filename: string, mimeType = ""): FileCategory {
  const ext = getExtension(filename);
  const mime = mimeType.toLowerCase();

  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (IMAGE_EXTS.has(ext) || mime.startsWith("image/")) return "image";
  if (
    ext === "docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (
    ext === "pptx" ||
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return "pptx";
  }
  if (VIDEO_EXTS.has(ext) || mime.startsWith("video/")) return "video";
  if (AUDIO_EXTS.has(ext) || mime.startsWith("audio/")) return "audio";
  if (TEXT_EXTS.has(ext) || mime.startsWith("text/")) return "text";
  return "other";
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getMimeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    txt: "text/plain; charset=utf-8",
    md: "text/markdown; charset=utf-8",
    json: "application/json; charset=utf-8",
    csv: "text/csv; charset=utf-8",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}
