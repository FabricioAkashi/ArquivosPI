import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  consumeRateLimit,
  getClientIp,
  rateLimitErrorResponse,
  WRITE_RATE_LIMIT,
} from "@/lib/rate-limit";
import { deleteFolder, updateFolder } from "@/lib/storage";

export async function PATCH(
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
    const body = (await req.json()) as { name?: string };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Informe o novo nome da pasta." },
        { status: 400 }
      );
    }

    const updated = await updateFolder(id, { name });
    if (!updated) {
      return NextResponse.json(
        { error: "Pasta não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ folder: updated });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar pasta." },
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
    const ok = await deleteFolder(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Pasta não encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir pasta." },
      { status: 500 }
    );
  }
}
