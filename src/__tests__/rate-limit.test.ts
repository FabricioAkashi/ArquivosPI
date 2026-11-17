import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllRateLimits,
  consumeRateLimit,
  peekRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("permite requisições até o limite e bloqueia excedentes", () => {
    const key = "test:ip-1";
    const now = 1_000_000;

    for (let i = 0; i < 3; i++) {
      const res = consumeRateLimit(key, 3, 60_000, now + i * 100);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(2 - i);
    }

    const blocked = consumeRateLimit(key, 3, 60_000, now + 500);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(59);
  });

  it("libera novamente quando a janela expira", () => {
    const key = "test:ip-2";
    const now = 1_000_000;

    consumeRateLimit(key, 2, 10_000, now);
    consumeRateLimit(key, 2, 10_000, now + 1000);
    expect(peekRateLimit(key, 2, 10_000, now + 2000).allowed).toBe(false);

    // Após 10s da primeira requisição, a cota volta
    const afterExpiry = peekRateLimit(key, 2, 10_000, now + 10_500);
    expect(afterExpiry.allowed).toBe(true);
    expect(afterExpiry.remaining).toBe(1);
  });

  it("limpa o contador ao chamar resetRateLimit", () => {
    const key = "test:ip-3";
    consumeRateLimit(key, 1, 60_000);
    expect(peekRateLimit(key, 1, 60_000).allowed).toBe(false);

    resetRateLimit(key);
    expect(peekRateLimit(key, 1, 60_000).allowed).toBe(true);
  });
});
