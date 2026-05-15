import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireReviewerOrAdminSession } from "@/lib/auth/require-reviewer-or-admin";
import { prisma } from "@/lib/db/prisma";
import styles from "./lista-revision.module.css";

const PAGE_SIZE = 15;

type SearchParams = Promise<{
  page?: string;
  ciudad?: string;
  analista?: string;
  desde?: string;
  hasta?: string;
}>;

function buildQuery(
  base: {
    ciudad: string;
    analista: string;
    desde: string;
    hasta: string;
  },
  page: number,
) {
  const p = new URLSearchParams();
  if (base.ciudad) p.set("ciudad", base.ciudad);
  if (base.analista) p.set("analista", base.analista);
  if (base.desde) p.set("desde", base.desde);
  if (base.hasta) p.set("hasta", base.hasta);
  if (page > 1) p.set("page", String(page));
  const q = p.toString();
  return q ? `?${q}` : "";
}

export default async function RevisionAnalisisListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireReviewerOrAdminSession();
  if (!session) {
    redirect("/login?next=/revision/analisis");
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const ciudad = (sp.ciudad ?? "").trim();
  const analista = (sp.analista ?? "").trim();
  const desde = (sp.desde ?? "").trim();
  const hasta = (sp.hasta ?? "").trim();

  const analysts = await prisma.user.findMany({
    where: { analyses: { some: {} } },
    select: { id: true, username: true, role: true },
    orderBy: { username: "asc" },
  });

  const analystOk =
    analista && analysts.some((a) => a.id === analista) ? analista : "";

  const where: Prisma.AnalysisWhereInput = {};
  if (ciudad) {
    where.city = { contains: ciudad, mode: "insensitive" };
  }
  if (analystOk) {
    where.userId = analystOk;
  }

  const createdAt: Prisma.DateTimeFilter = {};
  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    const d = new Date(`${desde}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) createdAt.gte = d;
  }
  if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    const d = new Date(`${hasta}T23:59:59.999Z`);
    if (!Number.isNaN(d.getTime())) createdAt.lte = d;
  }
  if (Object.keys(createdAt).length > 0) {
    where.createdAt = createdAt;
  }

  const skip = (page - 1) * PAGE_SIZE;

  const [total, rows] = await prisma.$transaction([
    prisma.analysis.count({ where }),
    prisma.analysis.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      select: {
        id: true,
        city: true,
        address: true,
        createdAt: true,
        errorMessage: true,
        user: { select: { username: true, id: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qBase = { ciudad, analista: analystOk, desde, hasta };

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>Auditoría · Todos los análisis</p>
      <h1 className={styles.title}>Revisión de <em>análisis</em></h1>
      <p className={styles.sub}>
        Todos los registros enviados desde campo. Filtros opcionales y listado
        paginado.
      </p>

      <form className={styles.filters} method="get" action="/revision/analisis">
        <label className={styles.fLabel}>
          Ciudad (contiene)
          <input
            className={styles.fInput}
            name="ciudad"
            defaultValue={ciudad}
            placeholder="Ej. Babahoyo"
            maxLength={120}
          />
        </label>
        <label className={styles.fLabel}>
          Analista
          <select
            className={styles.fSelect}
            name="analista"
            defaultValue={analystOk}
          >
            <option value="">— Todos —</option>
            {analysts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.username} ({a.role})
              </option>
            ))}
          </select>
        </label>
        <label className={styles.fLabel}>
          Desde
          <input
            className={styles.fInput}
            type="date"
            name="desde"
            defaultValue={desde}
          />
        </label>
        <label className={styles.fLabel}>
          Hasta
          <input
            className={styles.fInput}
            type="date"
            name="hasta"
            defaultValue={hasta}
          />
        </label>
        <div className={styles.fActions}>
          <button className={styles.fSubmit} type="submit">
            Aplicar filtros
          </button>
          <Link className={styles.fReset} href="/revision/analisis">
            Limpiar
          </Link>
        </div>
      </form>

      <p className={styles.count}>{total} resultado(s) con los filtros actuales.</p>

      {rows.length === 0 ? (
        <p className={styles.empty}>No hay análisis con estos criterios.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.id} className={styles.card}>
              <Link className={styles.cardLink} href={`/revision/analisis/${r.id}`}>
                <div className={styles.cardContent}>
                  <span className={styles.date}>
                    {r.createdAt.toLocaleString("es-EC", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className={styles.user}>@{r.user.username}</span>
                  <span className={styles.loc}>
                    {r.city} · {r.address}
                  </span>
                </div>
                <div className={styles.status}>
                  {r.errorMessage ? (
                    <span className={styles.badgeErr}>Avisos</span>
                  ) : (
                    <span className={styles.badgeOk}>OK</span>
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
              href={`/revision/analisis${buildQuery(qBase, page - 1)}`}
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
              href={`/revision/analisis${buildQuery(qBase, page + 1)}`}
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
