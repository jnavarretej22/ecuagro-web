import { getSession } from "./get-session";

/** Sesión válida con rol ADMIN, o `null`. */
export async function requireAdminSession() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}
