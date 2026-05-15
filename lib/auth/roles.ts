/** Ruta por defecto tras login o cuando el rol no coincide con la URL. */
export function homePathForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "FIELD":
      return "/analisis";
    case "REVIEWER":
      return "/revision/analisis";
    default:
      return "/login";
  }
}

/** Área protegida por el middleware (orden: más específico primero si se amplía). */
export type RouteAccess = "admin" | "field" | "revision" | "revisor" | "none";

export function getRouteAccess(pathname: string): RouteAccess {
  if (pathname.startsWith("/api/admin") || pathname.startsWith("/admin")) {
    return "admin";
  }
  if (pathname.startsWith("/api/analyses") || pathname.startsWith("/analisis")) {
    return "field";
  }
  if (pathname.startsWith("/revision")) {
    return "revision";
  }
  if (pathname.startsWith("/revisor")) {
    return "revisor";
  }
  return "none";
}

export function roleAllowedForAccess(
  access: Exclude<RouteAccess, "none">,
  role: string,
): boolean {
  if (access === "admin") return role === "ADMIN";
  if (access === "field") return role === "FIELD" || role === "ADMIN";
  if (access === "revision") return role === "REVIEWER" || role === "ADMIN";
  if (access === "revisor") return role === "REVIEWER";
  return false;
}
