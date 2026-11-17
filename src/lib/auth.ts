import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "pi_admin_session";

function getSecret(): string {
  return process.env.AUTH_SECRET || "aquivos-pi-dev-secret-key-change-me";
}

export function getConfiguredPin(): string {
  return process.env.ADMIN_PIN || "1234";
}

export function isUsingDefaultPin(): boolean {
  return !process.env.ADMIN_PIN;
}

export function verifyPin(pin: string): boolean {
  const expected = getConfiguredPin();
  const a = crypto.createHash("sha256").update(pin).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(): string {
  const issuedAt = Date.now().toString();
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(issuedAt)
    .digest("hex");
  return `${issuedAt}.${sig}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [issuedAt, sig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(issuedAt)
    .digest("hex");

  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length) return false;
    if (!crypto.timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const ageMs = Date.now() - Number(issuedAt);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < sevenDaysMs;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
