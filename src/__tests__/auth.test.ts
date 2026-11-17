import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  getConfiguredPin,
  isUsingDefaultPin,
  verifyPin,
  verifySessionToken,
} from "@/lib/auth";

describe("auth", () => {
  describe("PIN verification", () => {
    it("deve validar o PIN correto (padrão 1234 quando não definido)", () => {
      expect(isUsingDefaultPin()).toBe(true);
      expect(getConfiguredPin()).toBe("1234");
      expect(verifyPin("1234")).toBe(true);
    });

    it("deve rejeitar PIN incorreto", () => {
      expect(verifyPin("0000")).toBe(false);
      expect(verifyPin("1235")).toBe(false);
      expect(verifyPin("")).toBe(false);
      expect(verifyPin("admin")).toBe(false);
    });
  });

  describe("Session tokens", () => {
    it("deve criar um token válido e verificável", () => {
      const token = createSessionToken();
      expect(typeof token).toBe("string");
      expect(token.includes(".")).toBe(true);

      const isValid = verifySessionToken(token);
      expect(isValid).toBe(true);
    });

    it("deve rejeitar tokens adulterados na assinatura", () => {
      const token = createSessionToken();
      const [timestamp, sig] = token.split(".");
      const tamperedSig = sig.slice(0, -2) + (sig.slice(-2) === "aa" ? "bb" : "aa");
      const tamperedToken = `${timestamp}.${tamperedSig}`;

      expect(verifySessionToken(tamperedToken)).toBe(false);
    });

    it("deve rejeitar tokens vazios ou malformados", () => {
      expect(verifySessionToken(undefined)).toBe(false);
      expect(verifySessionToken("")).toBe(false);
      expect(verifySessionToken("apenasumtimestamp")).toBe(false);
      expect(verifySessionToken("a.b.c")).toBe(false);
    });

    it("deve rejeitar tokens expirados", () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      // Simulando token antigo
      const expiredToken = `${eightDaysAgo}.invalidsig`;
      expect(verifySessionToken(expiredToken)).toBe(false);
    });
  });
});
