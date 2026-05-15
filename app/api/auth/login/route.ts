import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/constants";
import { homePathForRole } from "@/lib/auth/roles";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const loginDeniedHint =
  "Si es el primer acceso, en la carpeta ecuagro-web ejecuta npm run db:seed y entra con BOOTSTRAP_ADMIN_USER y BOOTSTRAP_ADMIN_PASSWORD de tu .env. Si ya cambiaste el .env después del seed, la contraseña en la base sigue siendo la de cuando corriste el seed.";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const o = body as Record<string, unknown>;
    const username =
      typeof o.username === "string" ? o.username.trim() : "";
    const password = typeof o.password === "string" ? o.password : "";
    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son obligatorios" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user?.active) {
      return NextResponse.json(
        { error: "Credenciales incorrectas", hint: loginDeniedHint },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciales incorrectas", hint: loginDeniedHint },
        { status: 401 },
      );
    }

    const token = await createSessionToken(user.id, user.role);
    const res = NextResponse.json({
      ok: true,
      redirect: homePathForRole(user.role),
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (e) {
    if (
      e instanceof Error &&
      e.message.includes("SESSION_SECRET")
    ) {
      return NextResponse.json(
        { error: "Sesión no configurada en el servidor" },
        { status: 500 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 },
    );
  }
}
