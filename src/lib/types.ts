export type FileCategory =
  | "pdf"
  | "image"
  | "docx"
  | "pptx"
  | "video"
  | "audio"
  | "text"
  | "other";

export interface Semester {
  id: string;
  name: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  semesterId: string;
  parentId?: string | null;
  name: string;
  createdAt: string;
}

export interface FileItem {
  id: string;
  semesterId: string;
  folderId?: string | null;
  name: string;
  mimeType: string;
  size: number;
  extension: string;
  category: FileCategory;
  url: string;
  storageKey: string;
  createdAt: string;
}

export interface Database {
  semesters: Semester[];
  folders?: Folder[];
  files: FileItem[];
}
