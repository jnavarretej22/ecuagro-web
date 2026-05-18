"use client";

import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/admin/user-validation";
import styles from "./users.module.css";

export type UserRow = {
  id: string;
  username: string;
  role: Role;
  active: boolean;
  /** ISO 8601 (p. ej. orden o APIs). */
  createdAt: string;
  /** Texto ya formateado en el servidor; no usar `toLocaleString` en el cliente. */
  createdAtLabel: string;
  createdByUsername: string | null;
};

const roleLabel: Record<Role, string> = {
  ADMIN: "Administrador",
  FIELD: "Analista de campo",
  REVIEWER: "Revisor",
};

const roleBadgeClass: Record<Role, string> = {
  ADMIN: "badgeAdmin",
  FIELD: "badgeField",
  REVIEWER: "badgeReviewer",
};

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const avatarClass: Record<Role, string> = {
  ADMIN: "avatarAdmin",
  FIELD: "avatarField",
  REVIEWER: "avatarReviewer",
};

/** Evita que `res.json()` rompa el flujo si el servidor devuelve HTML o cuerpo vacío. */
function parseApiErrorBody(text: string): { error?: string } {
  const t = text.trim();
  if (!t) return {};
  try {
    const o = JSON.parse(t) as unknown;
    if (typeof o === "object" && o !== null && !Array.isArray(o)) {
      return o as { error?: string };
    }
  } catch {
    /* no JSON */
  }
  return {};
}

function UserRowEditor({
  user,
  currentUserId,
}: {
  user: UserRow;
  currentUserId: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRole(user.role);
    setActive(user.active);
    setPassword("");
    setError(null);
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body: Record<string, unknown> = {};
    if (role !== user.role) body.role = role;
    if (active !== user.active) body.active = active;
    if (password.trim()) body.password = password;
    if (Object.keys(body).length === 0) {
      setError("No hay cambios que guardar.");
      return;
    }
    setBusy(true);
    try {
      let res: Response;
      try {
        res = await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        setError("No se pudo conectar al servidor.");
        return;
      }
      const text = await res.text();
      const data = parseApiErrorBody(text);
      if (!res.ok) {
        setError(
          data.error ??
            `Error al guardar (código ${res.status}).`,
        );
        return;
      }
      setPassword("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className={styles.details}>
      <summary>Editar</summary>
      <div className={styles.editPanel}>
        <form className={styles.editGrid} onSubmit={(ev) => void save(ev)}>
          <label className={styles.label}>
            Rol
            <select
              className={styles.select}
              value={role}
              onChange={(ev) => setRole(ev.target.value as Role)}
            >
              <option value="ADMIN">{roleLabel.ADMIN}</option>
              <option value="FIELD">{roleLabel.FIELD}</option>
              <option value="REVIEWER">{roleLabel.REVIEWER}</option>
            </select>
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={active}
              onChange={(ev) => setActive(ev.target.checked)}
            />
            Activo
          </label>
          <label className={styles.label}>
            Nueva contraseña (opcional)
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder={`Mín. ${MIN_PASSWORD_LENGTH} caracteres`}
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button className={styles.btn} type="submit" disabled={busy}>
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
        {user.id === currentUserId ? (
          <p className={styles.you}>Esta es tu sesión actual.</p>
        ) : null}
      </div>
    </details>
  );
}

export default function UsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setCreateError(null);
    const fd = new FormData(form);
    const username = String(fd.get("username") ?? "");
    const password = String(fd.get("password") ?? "");
    const role = String(fd.get("role") ?? "FIELD") as Role;
    setCreateBusy(true);
    try {
      let res: Response;
      try {
        res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
            role,
          }),
        });
      } catch {
        setCreateError(
          "No se pudo conectar al servidor. Comprueba que Next.js esté en marcha y que entres por el mismo host y puerto (p. ej. todo en localhost:3010).",
        );
        return;
      }
      const text = await res.text();
      const data = parseApiErrorBody(text);
      if (!res.ok) {
        setCreateError(
          data.error ??
            (res.status === 409
              ? "Ese nombre de usuario ya está en uso."
              : `No se pudo crear el usuario (código ${res.status}).`),
        );
        return;
      }
      form.reset();
      router.refresh();
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <p className={styles.kicker}>Fase 5</p>
        <h1 className={styles.title}>Usuarios</h1>
        <p className={styles.sub}>
          Crea analistas de campo y revisores. Contraseña mínimo{" "}
          {MIN_PASSWORD_LENGTH} caracteres. Usuario: letras, números, punto y
          guiones.
        </p>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Nuevo usuario</h2>
        <form className={styles.formGrid} onSubmit={(ev) => void createUser(ev)}>
          <label className={styles.label}>
            Usuario
            <input
              className={styles.input}
              name="username"
              required
              autoComplete="off"
              minLength={3}
            />
          </label>
          <label className={styles.label}>
            Contraseña
            <input
              className={styles.input}
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
            />
          </label>
          <label className={styles.label}>
            Rol
            <select className={styles.select} name="role" defaultValue="FIELD">
              <option value="FIELD">{roleLabel.FIELD}</option>
              <option value="REVIEWER">{roleLabel.REVIEWER}</option>
              <option value="ADMIN">{roleLabel.ADMIN}</option>
            </select>
          </label>
          {createError ? (
            <p className={styles.error}>{createError}</p>
          ) : null}
          <button className={styles.btn} type="submit" disabled={createBusy}>
            {createBusy ? "Creando…" : "Crear usuario"}
          </button>
        </form>
      </section>

      <section className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Creado por</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className={styles.userCell}>
                    <span className={`${styles.avatar} ${styles[avatarClass[u.role]]}`}>
                      {getInitials(u.username)}
                    </span>
                    <strong>{u.username}</strong>
                  </div>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles[roleBadgeClass[u.role]]}`}>
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td>
                  <span
                    className={u.active ? styles.badge : `${styles.badge} ${styles.badgeOff}`}
                  >
                    {u.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className={styles.rowMuted}>{u.createdAtLabel}</td>
                <td className={styles.rowMuted}>
                  {u.createdByUsername ?? "—"}
                </td>
                <td>
                  <UserRowEditor user={u} currentUserId={currentUserId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
