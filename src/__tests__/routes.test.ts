import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (_name: string) => undefined,
  }),
}));

import { GET as getAuth, POST as postAuth, DELETE as deleteAuth } from "@/app/api/auth/route";
import { GET as getSemesters } from "@/app/api/semesters/route";

describe("API Route Handlers", () => {
  describe("GET /api/auth", () => {
    it("deve retornar status inicial de autenticação e configuração", async () => {
      const res = await getAuth();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty("authenticated");
      expect(json.authenticated).toBe(false);
      expect(json).toHaveProperty("usingDefaultPin");
      expect(json).toHaveProperty("storageMode");
    });
  });

  describe("POST /api/auth", () => {
    it("deve rejeitar PIN incorreto com status 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "errado" }),
      });

      const res = await postAuth(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toContain("PIN incorreto");
    });

    it("deve autenticar PIN correto (1234) e definir cookie de sessão", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "1234" }),
      });

      const res = await postAuth(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.ok).toBe(true);

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("pi_admin_session=");
    });
  });

  describe("DELETE /api/auth", () => {
    it("deve remover a sessão", async () => {
      const res = await deleteAuth();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  describe("GET /api/semesters", () => {
    it("deve listar os semestres com sucesso", async () => {
      const res = await getSemesters();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json.semesters)).toBe(true);
      expect(Array.isArray(json.files)).toBe(true);
    });
  });
});
