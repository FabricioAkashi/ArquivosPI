import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  consumeRateLimit,
  getClientIp,
  rateLimitErrorResponse,
  WRITE_RATE_LIMIT,
} from "@/lib/rate-limit";
import {
  registerCloudFileRecord,
  saveLocalFileAndRecord,
} from "@/lib/storage";

const MAX_LOCAL_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest) {
  const rl = consumeRateLimit(
    `write:${getClientIp(req)}`,
    WRITE_RATE_LIMIT.limit,
    WRITE_RATE_LIMIT.windowMs
  );
  if (!rl.allowed) {
    return rateLimitErrorResponse(rl);
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Modo de edição bloqueado. Desbloqueie com o PIN." },
      { status: 401 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as {
        semesterId?: string;
        folderId?: string | null;
        name?: string;
        mimeType?: string;
        size?: number;
        url?: string;
      };

      if (!body.semesterId || !body.name || !body.url) {
        return NextResponse.json(
          { error: "Dados incompletos para registrar o arquivo." },
          { status: 400 }
        );
      }

      const file = await registerCloudFileRecord({
        semesterId: body.semesterId,
        folderId: body.folderId || null,
        name: body.name,
        mimeType: body.mimeType || "",
        size: Number(body.size) || 0,
        url: body.url,
      });

      return NextResponse.json({ file }, { status: 201 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const semesterId = formData.get("semesterId");
    const folderId = formData.get("folderId") as string | null;

    if (!(file instanceof File) || typeof semesterId !== "string" || !semesterId) {
      return NextResponse.json(
        { error: "Envie um arquivo e informe o semestre." },
        { status: 400 }
      );
    }

    if (file.size > MAX_LOCAL_FILE_BYTES) {
      return NextResponse.json(
        { error: "O arquivo excede o limite máximo permitido de 100 MB." },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > MAX_LOCAL_FILE_BYTES) {
      return NextResponse.json(
        { error: "O arquivo excede o limite máximo permitido de 100 MB." },
        { status: 413 }
      );
    }

    const saved = await saveLocalFileAndRecord({
      semesterId,
      folderId: folderId || null,
      name: file.name,
      mimeType: file.type,
      buffer,
    });

    return NextResponse.json({ file: saved }, { status: 201 });
  } catch (err) {
    console.error("POST /api/upload error:", err);
    const message =
      err instanceof Error ? err.message : "Erro ao salvar arquivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
