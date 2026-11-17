import fs from "fs";
import fsp from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  consumeRateLimit,
  getClientIp,
  rateLimitErrorResponse,
  READ_RATE_LIMIT,
  WRITE_RATE_LIMIT,
} from "@/lib/rate-limit";
import {
  deleteFileRecord,
  getCloudFileStream,
  getFileById,
  resolveLocalUploadPath,
} from "@/lib/storage";

function buildSafeFileHeaders(params: {
  fileName: string;
  extension: string;
  mimeType: string;
  isDownload: boolean;
}): Record<string, string> {
  const encodedName = encodeURIComponent(params.fileName);
  const ext = params.extension.toLowerCase();
  const mime = params.mimeType.toLowerCase();

  const isHtmlLike =
    mime.includes("text/html") ||
    mime.includes("application/xhtml+xml") ||
    ext === "html" ||
    ext === "htm" ||
    ext === "xhtml";

  const isSvg = mime.includes("image/svg+xml") || ext === "svg";

  // HTML/XHTML sempre servidos como attachment para evitar execução na origem principal
  const disposition =
    params.isDownload || isHtmlLike
      ? `attachment; filename*=UTF-8''${encodedName}`
      : `inline; filename*=UTF-8''${encodedName}`;

  const headers: Record<string, string> = {
    "Content-Type": params.mimeType || "application/octet-stream",
    "Content-Disposition": disposition,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=3600",
  };

  if (isHtmlLike || isSvg) {
    headers["Content-Security-Policy"] = "sandbox; default-src 'none'";
  }

  return headers;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const rl = consumeRateLimit(
    `read:${getClientIp(req)}`,
    READ_RATE_LIMIT.limit,
    READ_RATE_LIMIT.windowMs
  );
  if (!rl.allowed) {
    return rateLimitErrorResponse(rl);
  }

  try {
    const { id } = await context.params;
    const file = await getFileById(id);

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não encontrado." },
        { status: 404 }
      );
    }

    const isDownload = req.nextUrl.searchParams.get("download") === "1";

    if (
      file.storageKey.startsWith("http://") ||
      file.storageKey.startsWith("https://")
    ) {
      const result = await getCloudFileStream(file.storageKey);
      if (!result || result.statusCode !== 200 || !result.stream) {
        return NextResponse.json(
          { error: "Arquivo não encontrado no armazenamento." },
          { status: 404 }
        );
      }

      const headers = buildSafeFileHeaders({
        fileName: file.name,
        extension: file.extension,
        mimeType:
          result.blob.contentType ||
          file.mimeType ||
          "application/octet-stream",
        isDownload,
      });

      return new NextResponse(result.stream, {
        status: 200,
        headers,
      });
    }

    const filePath = resolveLocalUploadPath(file.storageKey);
    if (!filePath) {
      return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
    }

    const stat = await fsp.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return NextResponse.json(
        { error: "Arquivo ausente no disco." },
        { status: 404 }
      );
    }

    const baseHeaders = buildSafeFileHeaders({
      fileName: file.name,
      extension: file.extension,
      mimeType: file.mimeType || "application/octet-stream",
      isDownload,
    });

    const range = req.headers.get("range");
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
        if (start >= stat.size || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${stat.size}` },
          });
        }
        const chunkSize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });
        const webStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk) => controller.enqueue(chunk));
            stream.on("end", () => controller.close());
            stream.on("error", (err) => controller.error(err));
          },
          cancel() {
            stream.destroy();
          },
        });

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
          },
        });
      }
    }

    const buffer = await fsp.readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err) {
    console.error("GET /api/files/[id] error:", err);
    return NextResponse.json(
      { error: "Erro ao servir arquivo." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
      { error: "Modo de edição bloqueado." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteFileRecord(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Arquivo não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir arquivo." },
      { status: 500 }
    );
  }
}
