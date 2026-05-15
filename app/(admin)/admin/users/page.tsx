import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { formatUserTableDate } from "@/lib/format/format-user-table-date";
import { prisma } from "@/lib/db/prisma";
import UsersClient, { type UserRow } from "./users-client";
import UsersDbError from "./users-db-error";

export default async function AdminUsersPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/login?next=/admin/users");
  }

  let rows;
  try {
    rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        createdBy: { select: { username: true } },
      },
    });
  } catch (e) {
    console.error(e);
    return <UsersDbError />;
  }

  const initialUsers: UserRow[] = rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
    createdAtLabel: formatUserTableDate(r.createdAt),
    createdByUsername: r.createdBy?.username ?? null,
  }));

  return (
    <UsersClient
      initialUsers={initialUsers}
      currentUserId={session.userId}
    />
  );
}
