import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

/** Solo **ADMIN**: borra el análisis de forma permanente (hard delete). */
export async function DELETE(_request: Request, context: Ctx) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Id requerido" }, { status: 400 });
  }

  const existing = await prisma.analysis.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 });
  }

  try {
    await prisma.analysis.delete({ where: { id } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "No se pudo eliminar el análisis" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
