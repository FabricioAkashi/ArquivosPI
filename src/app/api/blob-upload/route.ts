import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdminAuthenticated } from "@/lib/auth";
import { isCloudStorageEnabled } from "@/lib/storage";

export async function POST(request: NextRequest) {
  if (!isCloudStorageEnabled()) {
    return NextResponse.json(
      { error: "Vercel Blob não configurado." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const authenticated = await isAdminAuthenticated();
        if (!authenticated) {
          throw new Error("Não autorizado. Desbloqueie o modo de edição.");
        }
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
        };
      },
      onUploadCompleted: async () => {
        // O registro no banco é confirmado pelo cliente via /api/upload
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
