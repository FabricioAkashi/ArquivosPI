import { NextRequest, NextResponse } from "next/server";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export const AUTH_RATE_LIMIT = {
  limit: 5,
  windowMs: 15 * 60 * 1000, // 5 tentativas falhas a cada 15 minutos
};

export const WRITE_RATE_LIMIT = {
  limit: 60,
  windowMs: 60 * 1000, // 60 requisições por minuto
};

export const READ_RATE_LIMIT = {
  limit: 180,
  windowMs: 60 * 1000, // 180 requisições por minuto
};

const store = new Map<string, { timestamps: number[]; windowMs: number }>();

function sweepExpired(now: number) {
  if (store.size < 500) return;
  for (const [key, entry] of store.entries()) {
    const valid = entry.timestamps.filter((ts) => now - ts < entry.windowMs);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      entry.timestamps = valid;
    }
  }
}

export function getClientIp(req?: NextRequest | Request): string {
  if (!req) return "local";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "local";
}

function computeStatus(
  timestamps: number[],
  limit: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const valid = timestamps.filter((ts) => now - ts < windowMs);
  const count = valid.length;
  const remaining = Math.max(0, limit - count);
  const oldest = valid[0] ?? now;
  const resetAt = oldest + windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  return {
    allowed: count < limit,
    limit,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
}

/**
 * Consulta o estado atual do rate limit sem incrementar o contador.
 * Útil para verificar bloqueio antes de validar credenciais.
 */
export function peekRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const entry = store.get(key);
  if (!entry) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt: now + windowMs,
      retryAfterSeconds: 0,
    };
  }
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
  if (entry.timestamps.length === 0) {
    store.delete(key);
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt: now + windowMs,
      retryAfterSeconds: 0,
    };
  }
  return computeStatus(entry.timestamps, limit, windowMs, now);
}

/**
 * Consome 1 cota na janela deslizante e retorna se a requisição foi permitida.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  sweepExpired(now);
  const entry = store.get(key);
  const valid = entry ? entry.timestamps.filter((ts) => now - ts < windowMs) : [];

  if (valid.length >= limit) {
    store.set(key, { timestamps: valid, windowMs });
    const status = computeStatus(valid, limit, windowMs, now);
    return { ...status, allowed: false };
  }

  valid.push(now);
  store.set(key, { timestamps: valid, windowMs });
  const remaining = Math.max(0, limit - valid.length);
  const resetAt = (valid[0] ?? now) + windowMs;

  return {
    allowed: true,
    limit,
    remaining,
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}

export function clearAllRateLimits(): void {
  store.clear();
}

export function rateLimitErrorResponse(
  result: RateLimitResult,
  message?: string
): NextResponse {
  const minutes = Math.ceil(result.retryAfterSeconds / 60);
  const waitLabel =
    result.retryAfterSeconds >= 60
      ? `${minutes} min`
      : `${result.retryAfterSeconds}s`;

  return NextResponse.json(
    {
      error:
        message ||
        `Muitas requisições. Aguarde ${waitLabel} e tente novamente.`,
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}
