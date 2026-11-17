import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createSessionToken,
  isAdminAuthenticated,
  isUsingDefaultPin,
  verifyPin,
} from "@/lib/auth";
import {
  AUTH_RATE_LIMIT,
  consumeRateLimit,
  getClientIp,
  peekRateLimit,
  rateLimitErrorResponse,
  resetRateLimit,
} from "@/lib/rate-limit";
import { isCloudStorageEnabled } from "@/lib/storage";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({
    authenticated,
    usingDefaultPin: isUsingDefaultPin(),
    storageMode: isCloudStorageEnabled() ? "cloud" : "local",
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitKey = `auth:${ip}`;
  const currentLimit = peekRateLimit(
    limitKey,
    AUTH_RATE_LIMIT.limit,
    AUTH_RATE_LIMIT.windowMs
  );

  if (!currentLimit.allowed) {
    const minutes = Math.ceil(currentLimit.retryAfterSeconds / 60);
    return rateLimitErrorResponse(
      currentLimit,
      `Muitas tentativas incorretas. Tente novamente em ${
        currentLimit.retryAfterSeconds >= 60
          ? `${minutes} min`
          : `${currentLimit.retryAfterSeconds}s`
      }.`
    );
  }

  try {
    const body = (await req.json()) as { pin?: string };
    const pin = typeof body.pin === "string" ? body.pin : "";

    if (!verifyPin(pin)) {
      const failed = consumeRateLimit(
        limitKey,
        AUTH_RATE_LIMIT.limit,
        AUTH_RATE_LIMIT.windowMs
      );
      const hint =
        failed.remaining > 0
          ? `(${failed.remaining} tentativa${failed.remaining === 1 ? "" : "s"} restante${failed.remaining === 1 ? "" : "s"})`
          : "(bloqueio temporário ativado)";

      return NextResponse.json(
        { error: `PIN incorreto. Tente novamente ${hint}.` },
        {
          status: 401,
          headers: {
            "X-RateLimit-Limit": String(failed.limit),
            "X-RateLimit-Remaining": String(failed.remaining),
          },
        }
      );
    }

    resetRateLimit(limitKey);
    const token = createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
