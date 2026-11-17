import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createSessionToken,
  isAdminAuthenticated,
  isUsingDefaultPin,
  verifyPin,
} from "@/lib/auth";
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
  try {
    const body = (await req.json()) as { pin?: string };
    const pin = typeof body.pin === "string" ? body.pin : "";

    if (!verifyPin(pin)) {
      return NextResponse.json(
        { error: "PIN incorreto. Tente novamente." },
        { status: 401 }
      );
    }

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
