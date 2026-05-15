import { getSession } from "./get-session";

/** Sesión válida con rol revisor o administrador (auditoría global). */
export async function requireReviewerOrAdminSession() {
  const session = await getSession();
  if (!session || (session.role !== "REVIEWER" && session.role !== "ADMIN")) {
    return null;
  }
  return session;
}
