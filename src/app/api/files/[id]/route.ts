import fs from "fs";
import fsp from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  deleteFileRecord,
  getFileById,
  resolveLocalUploadPath,
} from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const file = await getFileById(id);

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não encontrado." },
        { status: 404 }
      );
    }

    if (
      file.storageKey.startsWith("http://") ||
      file.storageKey.startsWith("https://")
    ) {
      return NextResponse.redirect(file.url);
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

    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    const encodedName = encodeURIComponent(file.name);
    const disposition = isDownload
      ? `attachment; filename*=UTF-8''${encodedName}`
      : `inline; filename*=UTF-8''${encodedName}`;

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
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": file.mimeType || "application/octet-stream",
            "Content-Disposition": disposition,
          },
        });
      }
    }

    const buffer = await fsp.readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": String(stat.size),
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
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
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
