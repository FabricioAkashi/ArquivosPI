import { describe, expect, it, beforeEach } from "vitest";
import {
  createSemester,
  deleteSemester,
  readDb,
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
});
