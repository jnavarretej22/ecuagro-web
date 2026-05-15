import { getSession } from "./get-session";

/** Sesión válida con rol analista de campo o administrador (pruebas / soporte). */
export async function requireFieldOrAdminSession() {
  const session = await getSession();
  if (!session || (session.role !== "FIELD" && session.role !== "ADMIN")) {
    return null;
  }
  return session;
}
