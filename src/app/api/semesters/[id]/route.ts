import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { deleteSemester, updateSemester } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
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
    const body = (await req.json()) as {
      name?: string;
      title?: string;
      description?: string;
    };

    const updated = await updateSemester(id, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Semestre não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ semester: updated });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar semestre." },
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
    const ok = await deleteSemester(id);
    if (!ok) {
      return NextResponse.json(
        { error: "Semestre não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir semestre." },
      { status: 500 }
    );
  }
}
