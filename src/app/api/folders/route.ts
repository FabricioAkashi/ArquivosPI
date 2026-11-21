import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  consumeRateLimit,
  getClientIp,
  rateLimitErrorResponse,
  WRITE_RATE_LIMIT,
} from "@/lib/rate-limit";
import { createFolder } from "@/lib/storage";
import { ProjectLink } from "@/lib/types";

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
    const body = (await req.json()) as {
      semesterId?: string;
      parentId?: string | null;
      name?: string;
      description?: string;
      members?: string[];
      advisor?: string;
      links?: ProjectLink[];
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
      description: body.description,
      members: body.members,
      advisor: body.advisor,
      links: body.links,
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
