import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { ensureAtLeastOneActiveAdminAfter } from "@/lib/admin/sole-admin";
import { parseRole, validateNewPassword } from "@/lib/admin/user-validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Id requerido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;

  const hasRole = "role" in o;
  const hasActive = "active" in o;
  const hasPassword = "password" in o;

  if (!hasRole && !hasActive && !hasPassword) {
    return NextResponse.json(
      { error: "Envía al menos uno: role, active o password" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  let nextRole = user.role;
  if (hasRole) {
    const r = parseRole(o.role);
    if (!r) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    nextRole = r;
  }

  let nextActive = user.active;
  if (hasActive) {
    if (typeof o.active !== "boolean") {
      return NextResponse.json(
        { error: "active debe ser booleano" },
        { status: 400 },
      );
    }
    nextActive = o.active;
  }

  if (hasRole || hasActive) {
    const guard = await ensureAtLeastOneActiveAdminAfter(
      user.id,
      nextRole,
      nextActive,
    );
    if (!guard.ok) {
      return NextResponse.json({ error: guard.message }, { status: 400 });
    }
  }

  const data: {
    role?: typeof nextRole;
    active?: boolean;
    passwordHash?: string;
  } = {};

  if (hasRole && nextRole !== user.role) {
    data.role = nextRole;
  }
  if (hasActive && nextActive !== user.active) {
    data.active = nextActive;
  }

  if (hasPassword) {
    const pwd =
      typeof o.password === "string" && o.password.length > 0
        ? o.password
        : "";
    const pwdErr = validateNewPassword(pwd);
    if (pwdErr) {
      return NextResponse.json({ error: pwdErr }, { status: 400 });
    }
    data.passwordHash = await hashPassword(pwd);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, user: { id: user.id } });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
