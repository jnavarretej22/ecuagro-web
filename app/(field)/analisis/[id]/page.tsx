import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireFieldOrAdminSession } from "@/lib/auth/require-field-or-admin";
import { prisma } from "@/lib/db/prisma";
import styles from "./detail.module.css";

type Props = {
  params: Promise<{ id: string }>;
};

// Validadores e interfaces para el JSON
interface Hallazgo {
  nombre?: string;
  confianza?: string;
  severidad?: string;
  descripcion?: string;
  nombreCientifico?: string;
}

interface Pilar {
  nota?: string;
  hallazgos?: Hallazgo[];
  sinHallazgos?: boolean;
}

interface PlanAccion {
  plazo?: string;
  titulo?: string;
  detalle?: string;
  prioridad?: string;
}

interface AnalysisResult {
  pilares?: {
    follaje?: Pilar;
    plagas?: Pilar;
    nutricion?: Pilar;
  };
  confianza?: number;
  severidad?: string;
  disclaimer?: string;
  planAccion?: PlanAccion[];
  accionUrgente?: string;
  diagnosticoIntegrado?: string;
  diagnosticoPrincipal?: string;
}

// Convertidor de clases de severidad
function getSevClass(sev?: string) {
  if (!sev) return styles.sevNone;
  const s = sev.toLowerCase();
  if (s.includes("sever") || s.includes("alt") || s.includes("grave"))
    return styles.sevSevere;
  if (s.includes("moderad")) return styles.sevModerate;
  if (s.includes("leve") || s.includes("baj")) return styles.sevLeve;
  return styles.sevNone;
}

// Convertidor de confianzas
function getConfClass(conf?: string) {
  if (!conf) return "";
  const c = conf.toLowerCase();
  if (c.includes("alt") || c.includes("high")) return styles.good;
  if (c.includes("baj") || c.includes("low")) return styles.warn;
  return "";
}

function parseResult(json: unknown): AnalysisResult | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;

  // Validar si tiene la estructura esperada:
  if (j.pilares || j.diagnosticoIntegrado || j.planAccion) {
    return j as unknown as AnalysisResult;
  }
  return null;
}

export default async function AnalisisDetallePage({ params }: Props) {
  const session = await requireFieldOrAdminSession();
  if (!session) {
    redirect("/login?next=/analisis");
  }

  const { id } = await params;
  const row = await prisma.analysis.findFirst({
    where: { id, userId: session.userId },
  });
  if (!row) {
    notFound();
  }

  const imgSrc = `data:${row.imageMime};base64,${row.imageBase64}`;
  const parsed = parseResult(row.resultJson);

  return (
    <div className={styles.wrap}>
      <p className={styles.back}>
        <Link href="/analisis">← Volver al listado</Link>
      </p>

      <p className={styles.eyebrow}>Diagnóstico fitosanitario · Banano</p>
      <h1 className={styles.title}>
        Resultado del <em>análisis</em>
      </h1>
      <p className={styles.meta}>
        {row.createdAt.toLocaleString("es-EC", {
          dateStyle: "long",
          timeStyle: "short",
        })}
      </p>

      {/* Metadata */}
      <dl className={styles.dl}>
        <div className={styles.dlItem}>
          <dt>Ciudad / zona</dt>
          <dd>{row.city}</dd>
        </div>
        <div className={styles.dlItem}>
          <dt>Dirección / parcela</dt>
          <dd>{row.address}</dd>
        </div>
        {row.fieldNotes ? (
          <div className={styles.dlItem} style={{ gridColumn: "1 / -1" }}>
            <dt>Notas de campo</dt>
            <dd>{row.fieldNotes}</dd>
          </div>
        ) : null}
        <div className={styles.dlItem}>
          <dt>Modelo IA</dt>
          <dd>
            {row.provider} · {row.model}
          </dd>
        </div>
      </dl>

      {/* Imagen */}
      <figure className={styles.figure}>
        <Image
          className={styles.img}
          src={imgSrc}
          alt="Imagen enviada para el análisis fitosanitario"
          width={row.imageWidth}
          height={row.imageHeight}
          unoptimized
        />
      </figure>

      {/* Aviso de error (si lo hay) */}
      {row.errorMessage ? (
        <section className={styles.errBox}>
          <h2 className={styles.errTitle}>Aviso del análisis</h2>
          <p className={styles.errText}>{row.errorMessage}</p>
        </section>
      ) : null}

      {/* Resultado */}
      {row.resultJson ? (
        <section className={styles.resultSection}>
          {parsed ? (
            <>
              {/* Header con severidad y confianza agregada */}
              {(parsed.diagnosticoPrincipal || parsed.severidad || parsed.confianza) && (
                <div className={styles.resultHeaderRow}>
                  <div>
                    {parsed.diagnosticoPrincipal && (
                      <h2 className={styles.title} style={{ fontSize: 24, marginBottom: 8 }}>
                        {parsed.diagnosticoPrincipal}
                      </h2>
                    )}
                    {parsed.severidad && (
                      <div className={`${styles.severityPill} ${getSevClass(parsed.severidad)}`}>
                        {parsed.severidad}
                      </div>
                    )}
                  </div>
                  {parsed.confianza && (
                    <div className={styles.confStack}>
                      <span className={`${styles.confTag} ${parsed.confianza > 80 ? styles.good : styles.warn}`}>
                        Confianza del modelo: {parsed.confianza}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Pillar cards */}
              {parsed.pilares && (
                <div className={styles.pillarsGrid}>
                  {/* Follaje (Pilar 1) */}
                  {parsed.pilares.follaje && (
                    <div className={`${styles.pillarCard} ${styles.p1}`}>
                      <div className={styles.pillarNum}>Pilar 1</div>
                      <div className={styles.pillarTitle}>Enfermedades del follaje</div>

                      {parsed.pilares.follaje.sinHallazgos ? (
                        <div className={styles.cleanBlock}>
                          <div className={styles.cleanBlockTitle}>✓ Sin indicios</div>
                          <div className={styles.cleanBlockSub}>
                            {parsed.pilares.follaje.nota || "No se detectaron enfermedades críticas"}
                          </div>
                        </div>
                      ) : (
                        parsed.pilares.follaje.hallazgos?.map((h, idx) => (
                          <div key={idx} className={styles.findingBlock}>
                            <div className={styles.findingName}>{h.nombre}</div>
                            {h.nombreCientifico && <div className={styles.findingSub}>{h.nombreCientifico}</div>}
                            <span className={`${styles.sevPill} ${getSevClass(h.severidad)}`}>
                              {h.severidad}
                            </span>
                            <div className={`${styles.confLabel} ${getConfClass(h.confianza)}`}>
                              {h.confianza}
                            </div>
                            {h.descripcion && <div style={{ fontSize: 13, marginTop: 8, color: "var(--ink-3)" }}>{h.descripcion}</div>}
                          </div>
                        ))
                      )}
                      
                      {parsed.pilares.follaje.nota && !parsed.pilares.follaje.sinHallazgos && (
                        <div className={styles.pillarNotes}>{parsed.pilares.follaje.nota}</div>
                      )}
                    </div>
                  )}

                  {/* Plagas (Pilar 2) */}
                  {parsed.pilares.plagas && (
                    <div className={`${styles.pillarCard} ${styles.p2}`}>
                      <div className={styles.pillarNum}>Pilar 2</div>
                      <div className={styles.pillarTitle}>Plagas y daños físicos</div>

                      {parsed.pilares.plagas.sinHallazgos ? (
                        <div className={styles.cleanBlock}>
                          <div className={styles.cleanBlockTitle}>✓ Favorable</div>
                          <div className={styles.cleanBlockSub}>
                            {parsed.pilares.plagas.nota || "No se detectaron plagas visibles"}
                          </div>
                        </div>
                      ) : (
                        parsed.pilares.plagas.hallazgos?.map((h, idx) => (
                          <div key={idx} className={styles.findingBlock}>
                            <div className={styles.findingName}>{h.nombre}</div>
                            {h.nombreCientifico && <div className={styles.findingSub}>{h.nombreCientifico}</div>}
                            <span className={`${styles.sevPill} ${getSevClass(h.severidad)}`}>
                              {h.severidad}
                            </span>
                            <div className={`${styles.confLabel} ${getConfClass(h.confianza)}`}>
                              {h.confianza}
                            </div>
                            {h.descripcion && <div style={{ fontSize: 13, marginTop: 8, color: "var(--ink-3)" }}>{h.descripcion}</div>}
                          </div>
                        ))
                      )}

                      {parsed.pilares.plagas.nota && !parsed.pilares.plagas.sinHallazgos && (
                        <div className={styles.pillarNotes}>{parsed.pilares.plagas.nota}</div>
                      )}
                    </div>
                  )}

                  {/* Nutrición (Pilar 3) */}
                  {parsed.pilares.nutricion && (
                    <div className={`${styles.pillarCard} ${styles.p3}`}>
                      <div className={styles.pillarNum}>Pilar 3</div>
                      <div className={styles.pillarTitle}>Estado nutricional</div>

                      {parsed.pilares.nutricion.sinHallazgos ? (
                        <div className={styles.cleanBlock}>
                          <div className={styles.cleanBlockTitle}>✓ Saludable</div>
                          <div className={styles.cleanBlockSub}>
                            {parsed.pilares.nutricion.nota || "No se observaron deficiencias nutricionales"}
                          </div>
                        </div>
                      ) : (
                        parsed.pilares.nutricion.hallazgos?.map((h, idx) => (
                          <div key={idx} className={styles.findingBlock}>
                            <div className={styles.findingName}>{h.nombre}</div>
                            {h.nombreCientifico && <div className={styles.findingSub}>{h.nombreCientifico}</div>}
                            <span className={`${styles.sevPill} ${getSevClass(h.severidad)}`}>
                              {h.severidad}
                            </span>
                            <div className={`${styles.confLabel} ${getConfClass(h.confianza)}`}>
                              {h.confianza}
                            </div>
                            {h.descripcion && <div style={{ fontSize: 13, marginTop: 8, color: "var(--ink-3)" }}>{h.descripcion}</div>}
                          </div>
                        ))
                      )}

                      {parsed.pilares.nutricion.nota && !parsed.pilares.nutricion.sinHallazgos && (
                        <div className={styles.pillarNotes}>{parsed.pilares.nutricion.nota}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Diagnóstico Integrado */}
              {parsed.diagnosticoIntegrado && (
                <div className={styles.integratedCard}>
                  <div className={styles.integratedEyebrow}>Diagnóstico integrado</div>
                  <div className={styles.integratedTitle}>Evaluación global del cultivo</div>
                  <div className={styles.integratedBody}>{parsed.diagnosticoIntegrado}</div>
                  {parsed.accionUrgente && (
                    <div className={styles.integratedAction}>
                      <strong>🚨 Acción Urgente:</strong> {parsed.accionUrgente}
                    </div>
                  )}
                </div>
              )}

              {/* Recomendaciones */}
              {parsed.planAccion && parsed.planAccion.length > 0 && (
                <div className={styles.recsSection}>
                  <h2 className={styles.title} style={{ fontSize: 24, marginBottom: 16 }}>
                    Plan de acción recomendado
                  </h2>
                  <div className={styles.recsList}>
                    {parsed.planAccion.map((rec, idx) => {
                      const priorityColor = rec.prioridad === "p1" ? styles.p1 : rec.prioridad === "p2" ? styles.p2 : styles.p3;
                      const priorityText = rec.prioridad === "p1" ? "1" : rec.prioridad === "p2" ? "2" : "3";
                      return (
                        <div key={idx} className={styles.recItem}>
                          <div className={`${styles.recPriority} ${priorityColor}`}>P{priorityText}</div>
                          <div className={styles.recContent}>
                            <div className={styles.recAction}>{rec.titulo}</div>
                            <div className={styles.recTreatment}>{rec.detalle}</div>
                            <div className={styles.recTime}>⏱ {rec.plazo}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              {parsed.disclaimer && (
                <div className={styles.disclaimerBox}>
                  <div className={styles.discIcon}>!</div>
                  <div>
                    <strong>Aviso importante:</strong> {parsed.disclaimer}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fallback: JSON raw formateado */
            <div className={styles.jsonBox}>
              <h2 className={styles.jsonTitle}>Resultado del análisis JSON</h2>
              <pre className={styles.pre}>
                {JSON.stringify(row.resultJson, null, 2)}
              </pre>
            </div>
          )}
        </section>
      ) : null}

      {/* Botones adicionales (Reset) */}
      <div className={styles.resetRow}>
        <Link href="/analisis/nuevo" className={styles.btnTertiary}>
          Realizar otro análisis
        </Link>
      </div>
    </div>
  );
}
