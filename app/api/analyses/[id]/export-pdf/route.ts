import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  // FIELD solo ve sus propios análisis; REVIEWER y ADMIN ven todos.
  const where =
    session.role === "FIELD"
      ? { id, userId: session.userId }
      : { id };

  const row = await prisma.analysis.findFirst({
    where,
    select: {
      id: true,
      city: true,
      address: true,
      fieldNotes: true,
      createdAt: true,
      provider: true,
      model: true,
      promptVersion: true,
      resultJson: true,
      errorMessage: true,
      imageBase64: true,
      imageMime: true,
      imageWidth: true,
      imageHeight: true,
      user: { select: { username: true } },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    city: row.city,
    address: row.address,
    fieldNotes: row.fieldNotes,
    createdAt: row.createdAt.toISOString(),
    provider: row.provider,
    model: row.model,
    promptVersion: row.promptVersion,
    resultJson: row.resultJson,
    errorMessage: row.errorMessage,
    imageBase64: row.imageBase64,
    imageMime: row.imageMime,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    analystUsername: row.user?.username ?? "—",
  });
}
