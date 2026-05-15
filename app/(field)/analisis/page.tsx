import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFieldOrAdminSession } from "@/lib/auth/require-field-or-admin";
import { prisma } from "@/lib/db/prisma";
import styles from "./lista.module.css";

const PAGE_SIZE = 10;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AnalisisListPage({ searchParams }: Props) {
  const session = await requireFieldOrAdminSession();
  if (!session) {
    redirect("/login?next=/analisis");
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [total, rows] = await prisma.$transaction([
    prisma.analysis.count({ where: { userId: session.userId } }),
    prisma.analysis.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      select: {
        id: true,
        city: true,
        address: true,
        createdAt: true,
        errorMessage: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>Diagnóstico fitosanitario · Banano</p>
      <h1 className={styles.title}>
        Mis <em>análisis</em>
      </h1>
      <p className={styles.sub}>
        {total} registro{total !== 1 ? "s" : ""} en tu cuenta.
      </p>

      <Link className={styles.newBtn} href="/analisis/nuevo">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
        Nuevo análisis
      </Link>

      {rows.length === 0 ? (
        <p className={styles.empty}>
          Aún no hay análisis.{" "}
          <Link href="/analisis/nuevo">Crear el primero</Link>
        </p>
      ) : (
        <ul className={styles.list}>
          {rows.map((r, i) => (
            <li key={r.id} className={styles.card}>
              <Link className={styles.cardLink} href={`/analisis/${r.id}`}>
                <div className={styles.cardIndex} aria-hidden>
                  {skip + i + 1}
                </div>
                <div className={styles.cardContent}>
                  <span className={styles.date}>
                    {r.createdAt.toLocaleString("es-EC", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className={styles.loc}>
                    {r.city} · {r.address}
                  </span>
                </div>
                <div className={styles.status}>
                  {r.errorMessage ? (
                    <span className={styles.badgeErr}>Con avisos</span>
                  ) : (
                    <span className={styles.badgeOk}>Listo</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className={styles.pager} aria-label="Paginación">
          {page > 1 ? (
            <Link
              className={styles.pageLink}
              href={`/analisis?page=${page - 1}`}
            >
              ← Anterior
            </Link>
          ) : (
            <span className={styles.pageDisabled}>← Anterior</span>
          )}
          <span className={styles.pageInfo}>
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              className={styles.pageLink}
              href={`/analisis?page=${page + 1}`}
            >
              Siguiente →
            </Link>
          ) : (
            <span className={styles.pageDisabled}>Siguiente →</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
