import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import {
  parseRole,
  validateNewPassword,
  validateUsername,
} from "@/lib/admin/user-validation";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const usernameErr = validateUsername(
    typeof o.username === "string" ? o.username : "",
  );
  if (usernameErr) {
    return NextResponse.json({ error: usernameErr }, { status: 400 });
  }
  const username = (o.username as string).trim();
  const password = typeof o.password === "string" ? o.password : "";
  const pwdErr = validateNewPassword(password);
  if (pwdErr) {
    return NextResponse.json({ error: pwdErr }, { status: 400 });
  }
  const role = parseRole(o.role);
  if (!role) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        active: true,
        createdById: session.userId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Ese nombre de usuario ya está en uso." },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "No se pudo crear el usuario" },
      { status: 500 },
    );
  }
}
