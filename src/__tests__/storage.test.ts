import { describe, expect, it, beforeEach } from "vitest";
import {
  createFolder,
  createSemester,
  deleteFolder,
  deleteSemester,
  readDb,
  saveLocalFileAndRecord,
  updateFileRecord,
  updateFolder,
  updateSemester,
  writeDb,
} from "@/lib/storage";

describe("storage", () => {
  beforeEach(async () => {
    // Reset para um estado de teste limpo
    await writeDb({
      semesters: [
        {
          id: "2026-2",
          name: "2026.2",
          title: "Projeto Integrador",
          description: "Teste inicial",
          createdAt: new Date().toISOString(),
        },
      ],
      folders: [],
      files: [],
    });
  });

  describe("Semesters CRUD", () => {
    it("deve criar um novo semestre gerando id único", async () => {
      const created = await createSemester({
        name: "2027.1",
        title: "Sistemas Distribuídos",
        description: "Projeto de microsserviços",
      });

      expect(created.id).toBe("2027-1");
      expect(created.name).toBe("2027.1");
      expect(created.title).toBe("Sistemas Distribuídos");

      const db = await readDb();
      expect(db.semesters.some((s) => s.id === "2027-1")).toBe(true);
    });

    it("deve evitar colisão de IDs adicionando sufixo numérico", async () => {
      const first = await createSemester({
        name: "2028.1",
        title: "Primeiro",
      });
      const second = await createSemester({
        name: "2028.1",
        title: "Segundo",
      });

      expect(first.id).toBe("2028-1");
      expect(second.id).toBe("2028-1-2");
    });

    it("deve atualizar os campos de um semestre existente", async () => {
      const updated = await updateSemester("2026-2", {
        title: "Novo Título Atualizado",
        description: "Nova descrição",
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe("Novo Título Atualizado");
      expect(updated?.description).toBe("Nova descrição");

      const db = await readDb();
      const item = db.semesters.find((s) => s.id === "2026-2");
      expect(item?.title).toBe("Novo Título Atualizado");
    });

    it("deve retornar null ao tentar atualizar semestre inexistente", async () => {
      const result = await updateSemester("nao-existe", { title: "X" });
      expect(result).toBeNull();
    });

    it("deve excluir um semestre pelo id", async () => {
      const deleted = await deleteSemester("2026-2");
      expect(deleted).toBe(true);

      const db = await readDb();
      expect(db.semesters.some((s) => s.id === "2026-2")).toBe(false);
    });

    it("deve retornar false ao excluir semestre inexistente", async () => {
      const deleted = await deleteSemester("fantasma");
      expect(deleted).toBe(false);
    });
  });

  describe("Folders CRUD", () => {
    it("deve criar uma pasta dentro de um semestre", async () => {
      const folder = await createFolder({
        semesterId: "2026-2",
        name: "Documentos de Requisitos",
      });

      expect(folder.id).toMatch(/^fld-/);
      expect(folder.semesterId).toBe("2026-2");
      expect(folder.name).toBe("Documentos de Requisitos");
      expect(folder.parentId).toBeNull();

      const db = await readDb();
      expect(db.folders?.some((f) => f.id === folder.id)).toBe(true);
    });

    it("deve criar subpastas aninhadas", async () => {
      const parent = await createFolder({
        semesterId: "2026-2",
        name: "Sprint 1",
      });

      const child = await createFolder({
        semesterId: "2026-2",
        parentId: parent.id,
        name: "Diagramas",
      });

      expect(child.parentId).toBe(parent.id);
      const db = await readDb();
      expect(db.folders?.length).toBe(2);
    });

    it("deve atualizar o nome de uma pasta existente", async () => {
      const folder = await createFolder({
        semesterId: "2026-2",
        name: "Nome Antigo",
      });

      const updated = await updateFolder(folder.id, { name: "Nome Atualizado" });
      expect(updated?.name).toBe("Nome Atualizado");

      const db = await readDb();
      const found = db.folders?.find((f) => f.id === folder.id);
      expect(found?.name).toBe("Nome Atualizado");
    });

    it("deve deletar uma pasta e cascatear para subpastas", async () => {
      const parent = await createFolder({
        semesterId: "2026-2",
        name: "Pasta Pai",
      });

      const child = await createFolder({
        semesterId: "2026-2",
        parentId: parent.id,
        name: "Pasta Filha",
      });

      const deleted = await deleteFolder(parent.id);
      expect(deleted).toBe(true);

      const db = await readDb();
      expect(db.folders?.some((f) => f.id === parent.id)).toBe(false);
      expect(db.folders?.some((f) => f.id === child.id)).toBe(false);
    });

    it("deve persistir ficha técnica e sanitizar links inválidos nas pastas", async () => {
      const folder = await createFolder({
        semesterId: "2026-2",
        name: "Grupo 01",
        advisor: "Prof. Silva",
        members: ["Ana", "Bruno"],
        description: "Sistema de monitoramento",
        links: [
          { label: "GitHub", url: "https://github.com/exemplo" },
          { label: "Malicioso", url: "javascript:alert(1)" },
        ],
      });

      expect(folder.advisor).toBe("Prof. Silva");
      expect(folder.members).toEqual(["Ana", "Bruno"]);
      expect(folder.links).toEqual([
        { label: "GitHub", url: "https://github.com/exemplo" },
      ]);
    });
  });

  describe("Files CRUD (rename, move, pin)", () => {
    it("deve renomear, mover entre pastas e fixar arquivo no topo", async () => {
      const folderA = await createFolder({ semesterId: "2026-2", name: "Pasta A" });
      const folderB = await createFolder({ semesterId: "2026-2", name: "Pasta B" });

      const saved = await saveLocalFileAndRecord({
        semesterId: "2026-2",
        folderId: folderA.id,
        name: "rascunho.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("conteudo"),
      });

      const updated = await updateFileRecord(saved.id, {
        name: "final.md",
        folderId: folderB.id,
        pinned: true,
      });

      expect(updated?.name).toBe("final.md");
      expect(updated?.extension).toBe("md");
      expect(updated?.folderId).toBe(folderB.id);
      expect(updated?.pinned).toBe(true);
    });
  });
});
