import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createSemester, isCloudStorageEnabled, readDb } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json({
      ...db,
      storageMode: isCloudStorageEnabled() ? "cloud" : "local",
    });
  } catch (err) {
    console.error("GET /api/semesters error:", err);
    return NextResponse.json(
      { error: "Falha ao carregar semestres." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Modo de edição bloqueado. Desbloqueie com o PIN." },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as {
      name?: string;
      title?: string;
      description?: string;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome do semestre (ex: 2026.2)." },
        { status: 400 }
      );
    }

    const semester = await createSemester({
      name,
      title: body.title?.trim() || name,
      description: body.description,
    });

    return NextResponse.json({ semester }, { status: 201 });
  } catch (err) {
    console.error("POST /api/semesters error:", err);
    return NextResponse.json(
      { error: "Não foi possível criar o semestre." },
      { status: 500 }
    );
  }
}
