import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Tras aplicar `nextRole` / `nextActive` al usuario `subjectId`,
 * debe quedar al menos un administrador activo en el sistema.
 */
export async function ensureAtLeastOneActiveAdminAfter(
  subjectId: string,
  nextRole: Role,
  nextActive: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const users = await prisma.user.findMany({
    select: { id: true, role: true, active: true },
  });
  let n = 0;
  for (const u of users) {
    const role = u.id === subjectId ? nextRole : u.role;
    const active = u.id === subjectId ? nextActive : u.active;
    if (role === "ADMIN" && active) n++;
  }
  if (n < 1) {
    return {
      ok: false,
      message:
        "Debe existir al menos un usuario administrador activo en el sistema.",
    };
  }
  return { ok: true };
}
