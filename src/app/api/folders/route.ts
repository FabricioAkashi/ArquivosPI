import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createFolder } from "@/lib/storage";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Modo de edição bloqueado. Desbloqueie com o PIN." },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as {
      semesterId?: string;
      parentId?: string | null;
      name?: string;
    };

    const name = body.name?.trim();
    if (!name || !body.semesterId) {
      return NextResponse.json(
        { error: "Informe o nome da pasta e o semestre." },
        { status: 400 }
      );
    }

    const folder = await createFolder({
      semesterId: body.semesterId,
      parentId: body.parentId || null,
      name,
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (err) {
    console.error("POST /api/folders error:", err);
    return NextResponse.json(
      { error: "Não foi possível criar a pasta." },
      { status: 500 }
    );
  }
}
