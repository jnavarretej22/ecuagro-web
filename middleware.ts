import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { sessionSecretMissingNextResponse } from "@/lib/auth/config-error-page";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getSessionSecretBytesOrNull } from "@/lib/auth/session-env";
import {
  getRouteAccess,
  homePathForRole,
  roleAllowedForAccess,
} from "@/lib/auth/roles";

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/analisis",
    "/analisis/:path*",
    "/revision",
    "/revision/:path*",
    "/revisor",
    "/revisor/:path*",
    "/api/admin/:path*",
    "/api/analyses",
    "/api/analyses/:path*",
  ],
};

function jsonUnauthorized() {
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}

function jsonForbidden() {
  return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secretBytes = getSessionSecretBytesOrNull();

  if (!secretBytes) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Sesión no configurada en el servidor",
          hint: "Define SESSION_SECRET (≥32 caracteres) en .env y reinicia.",
        },
        { status: 500 },
      );
    }
    return sessionSecretMissingNextResponse();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) return jsonUnauthorized();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  let role: string;
  try {
    const { payload } = await jwtVerify(token, secretBytes, {
      algorithms: ["HS256"],
    });
    if (typeof payload.role !== "string") throw new Error("sin rol");
    role = payload.role;
  } catch {
    if (pathname.startsWith("/api/")) return jsonUnauthorized();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const access = getRouteAccess(pathname);
  if (access === "none") {
    return NextResponse.next();
  }

  /** Borrado de análisis: solo ADMIN (antes del control de ruta "field"). */
  if (
    request.method === "DELETE" &&
    /^\/api\/analyses\/[^/]+$/.test(pathname)
  ) {
    if (role !== "ADMIN") {
      return jsonForbidden();
    }
    return NextResponse.next();
  }

  if (!roleAllowedForAccess(access, role)) {
    if (pathname.startsWith("/api/")) return jsonForbidden();
    const home = homePathForRole(role);
    if (home === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}
