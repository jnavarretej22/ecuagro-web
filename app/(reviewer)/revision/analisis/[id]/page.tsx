import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DeleteAnalysisButton from "@/components/delete-analysis-button";
import ExportPdfButton from "@/components/export-pdf-button";
import { requireReviewerOrAdminSession } from "@/lib/auth/require-reviewer-or-admin";
import { prisma } from "@/lib/db/prisma";
import styles from "../../../../(field)/analisis/[id]/detail.module.css";
import extra from "./detail-revision-extra.module.css";

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
  diagnosticoDiferencial?: string;
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
  categoria?: string;
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
  calidadImagen?: string;
  calidadImagenNota?: string;
  estadioFenologico?: string;
  recomendacionSeguimiento?: string | null;
}

function getCalidadLabel(c?: string): string | null {
  if (!c) return null;
  const v = c.toLowerCase();
  if (v.includes("excel")) return "Excelente";
  if (v.includes("acept")) return "Aceptable";
  if (v.includes("limit")) return "Limitada";
  if (v.includes("insuf")) return "Insuficiente";
  return c;
}

function getEstadioLabel(e?: string): string | null {
  if (!e) return null;
  const v = e.toLowerCase();
  if (v.includes("no determ")) return null;
  return e.charAt(0).toUpperCase() + e.slice(1);
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

  if (j.pilares || j.diagnosticoIntegrado || j.planAccion) {
    return j as unknown as AnalysisResult;
  }
  return null;
}

export default async function RevisionAnalisisDetallePage({ params }: Props) {
  const session = await requireReviewerOrAdminSession();
  if (!session) {
    redirect("/login?next=/revision/analisis");
  }

  const { id } = await params;
  const row = await prisma.analysis.findUnique({
    where: { id },
    include: { user: { select: { username: true, id: true, role: true } } },
  });
  if (!row) {
    notFound();
  }

  const imgSrc = `data:${row.imageMime};base64,${row.imageBase64}`;
  const isAdmin = session.role === "ADMIN";
  const parsed = parseResult(row.resultJson);

  return (
    <div className={styles.wrap}>
      <p className={styles.back}>
        <Link href="/revision/analisis">← Volver al listado</Link>
      </p>
      
      <p className={styles.eyebrow}>Auditoría · Diagnóstico fitosanitario</p>
      <h1 className={styles.title}>
        Análisis <em>(revisión)</em>
      </h1>
      <p className={styles.meta}>
        {row.createdAt.toLocaleString("es-EC", {
          dateStyle: "long",
          timeStyle: "short",
        })}
      </p>

      {/* Metadata extendida */}
      <dl className={styles.dl}>
        <div className={styles.dlItem}>
          <dt>Analista</dt>
          <dd>
            {row.user.username} ({row.user.role})
            <br />
            <code style={{ fontSize: 11, color: "var(--ink-4)" }}>{row.user.id}</code>
          </dd>
        </div>
        <div className={styles.dlItem}>
          <dt>Ciudad / zona</dt>
          <dd>{row.city}</dd>
        </div>
        <div className={styles.dlItem}>
          <dt>Dirección / parcela</dt>
          <dd>{row.address}</dd>
        </div>
        <div className={styles.dlItem}>
          <dt>Modelo IA</dt>
          <dd>
            {row.provider} · {row.model}
          </dd>
        </div>
        {row.fieldNotes ? (
          <div className={styles.dlItem} style={{ gridColumn: "1 / -1" }}>
            <dt>Notas de campo</dt>
            <dd>{row.fieldNotes}</dd>
          </div>
        ) : null}
        {parsed && getCalidadLabel(parsed.calidadImagen) ? (
          <div className={styles.dlItem}>
            <dt>Calidad de imagen</dt>
            <dd>
              {getCalidadLabel(parsed.calidadImagen)}
              {parsed.calidadImagenNota ? (
                <span style={{ display: "block", fontSize: 13, color: "var(--ink-3)", fontWeight: 400, marginTop: 4 }}>
                  {parsed.calidadImagenNota}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        {parsed && getEstadioLabel(parsed.estadioFenologico) ? (
          <div className={styles.dlItem}>
            <dt>Estadio fenológico</dt>
            <dd>{getEstadioLabel(parsed.estadioFenologico)}</dd>
          </div>
        ) : null}
      </dl>

      <figure className={styles.figure}>
        <Image
          className={styles.img}
          src={imgSrc}
          alt="Imagen enviada para el análisis"
          width={row.imageWidth}
          height={row.imageHeight}
          unoptimized
        />
      </figure>

      {row.errorMessage ? (
        <section className={styles.errBox}>
          <h2 className={styles.errTitle}>Aviso del análisis</h2>
          <p className={styles.errText}>{row.errorMessage}</p>
        </section>
      ) : null}

      {/* Resultado estructurado */}
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
                  {/* Follaje */}
                  {parsed.pilares.follaje && (
                    <div className={`${styles.pillarCard} ${styles.p1}`}>
                      <div className={styles.pillarNum}>Pilar 1</div>
                      <div className={styles.pillarTitle}>Enfermedades del follaje</div>
                      {parsed.pilares.follaje.sinHallazgos ? (
                        <div className={styles.cleanBlock}>
                          <div className={styles.cleanBlockTitle}>✓ Sin indicios</div>
                          <div className={styles.cleanBlockSub}>{parsed.pilares.follaje.nota}</div>
                        </div>
                      ) : (
                        parsed.pilares.follaje.hallazgos?.map((h, idx) => (
                          <div key={idx} className={styles.findingBlock}>
                            <div className={styles.findingName}>{h.nombre}</div>
                            {h.nombreCientifico && <div className={styles.findingSub}>{h.nombreCientifico}</div>}
                            <span className={`${styles.sevPill} ${getSevClass(h.severidad)}`}>{h.severidad}</span>
                            <div className={`${styles.confLabel} ${getConfClass(h.confianza)}`}>{h.confianza}</div>
                            {h.descripcion && <div style={{ fontSize: 13, marginTop: 8, color: "var(--ink-3)" }}>{h.descripcion}</div>}
                            {h.diagnosticoDiferencial && (
                              <div style={{ fontSize: 12, marginTop: 6, padding: "6px 10px", borderRadius: 8, background: "var(--cream, #faf9f5)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
                                <strong style={{ color: "var(--ink-2)" }}>Diferencial: </strong>
                                {h.diagnosticoDiferencial}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {parsed.pilares.follaje.nota && !parsed.pilares.follaje.sinHallazgos && (
                        <div className={styles.pillarNotes}>{parsed.pilares.follaje.nota}</div>
                      )}
                    </div>
                  )}

                  {/* Plagas */}
                  {parsed.pilares.plagas && (
                    <div className={`${styles.pillarCard} ${styles.p2}`}>
                      <div className={styles.pillarNum}>Pilar 2</div>
                      <div className={styles.pillarTitle}>Plagas y daños físicos</div>
                      {parsed.pilares.plagas.sinHallazgos ? (
                        <div className={styles.cleanBlock}>
                          <div className={styles.cleanBlockTitle}>✓ Favorable</div>
                          <div className={styles.cleanBlockSub}>{parsed.pilares.plagas.nota}</div>
                        </div>
                      ) : (
                        parsed.pilares.plagas.hallazgos?.map((h, idx) => (
                          <div key={idx} className={styles.findingBlock}>
                            <div className={styles.findingName}>{h.nombre}</div>
                            {h.nombreCientifico && <div className={styles.findingSub}>{h.nombreCientifico}</div>}
                            <span className={`${styles.sevPill} ${getSevClass(h.severidad)}`}>{h.severidad}</span>
                            <div className={`${styles.confLabel} ${getConfClass(h.confianza)}`}>{h.confianza}</div>
                            {h.descripcion && <div style={{ fontSize: 13, marginTop: 8, color: "var(--ink-3)" }}>{h.descripcion}</div>}
                            {h.diagnosticoDiferencial && (
                              <div style={{ fontSize: 12, marginTop: 6, padding: "6px 10px", borderRadius: 8, background: "var(--cream, #faf9f5)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
                                <strong style={{ color: "var(--ink-2)" }}>Diferencial: </strong>
                                {h.diagnosticoDiferencial}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {parsed.pilares.plagas.nota && !parsed.pilares.plagas.sinHallazgos && (
                        <div className={styles.pillarNotes}>{parsed.pilares.plagas.nota}</div>
                      )}
                    </div>
                  )}

                  {/* Nutrición */}
                  {parsed.pilares.nutricion && (
                    <div className={`${styles.pillarCard} ${styles.p3}`}>
                      <div className={styles.pillarNum}>Pilar 3</div>
                      <div className={styles.pillarTitle}>Estado nutricional</div>
                      {parsed.pilares.nutricion.sinHallazgos ? (
                        <div className={styles.cleanBlock}>
                          <div className={styles.cleanBlockTitle}>✓ Saludable</div>
                          <div className={styles.cleanBlockSub}>{parsed.pilares.nutricion.nota}</div>
                        </div>
                      ) : (
                        parsed.pilares.nutricion.hallazgos?.map((h, idx) => (
                          <div key={idx} className={styles.findingBlock}>
                            <div className={styles.findingName}>{h.nombre}</div>
                            {h.nombreCientifico && <div className={styles.findingSub}>{h.nombreCientifico}</div>}
                            <span className={`${styles.sevPill} ${getSevClass(h.severidad)}`}>{h.severidad}</span>
                            <div className={`${styles.confLabel} ${getConfClass(h.confianza)}`}>{h.confianza}</div>
                            {h.descripcion && <div style={{ fontSize: 13, marginTop: 8, color: "var(--ink-3)" }}>{h.descripcion}</div>}
                            {h.diagnosticoDiferencial && (
                              <div style={{ fontSize: 12, marginTop: 6, padding: "6px 10px", borderRadius: 8, background: "var(--cream, #faf9f5)", border: "1px solid var(--line)", color: "var(--ink-3)" }}>
                                <strong style={{ color: "var(--ink-2)" }}>Diferencial: </strong>
                                {h.diagnosticoDiferencial}
                              </div>
                            )}
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
                            <div className={styles.recAction}>
                              {rec.titulo}
                              {rec.categoria ? (
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: "var(--green-50, #e8f5e9)", color: "var(--green-700)", verticalAlign: "middle" }}>
                                  {rec.categoria}
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.recTreatment}>{rec.detalle}</div>
                            <div className={styles.recTime}>⏱ {rec.plazo}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recomendación de seguimiento */}
              {parsed.recomendacionSeguimiento && (
                <div style={{ margin: "16px 0", padding: "14px 18px", borderRadius: 14, background: "var(--amber-lt, #fff5dc)", border: "1px solid rgba(186,117,23,0.3)", borderLeft: "3px solid var(--amber, #a2640a)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--amber, #a2640a)", marginBottom: 6 }}>
                    Recomendación de seguimiento
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>
                    {parsed.recomendacionSeguimiento}
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

              {/* Debug raw output para revisores */}
              <div className={styles.jsonBox}>
                <h2 className={styles.jsonTitle} style={{ fontSize: 14 }}>Debug Raw JSON</h2>
                <pre className={styles.pre}>
                  {JSON.stringify(row.resultJson, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className={styles.jsonBox}>
              <h2 className={styles.jsonTitle}>Resultado (JSON)</h2>
              <pre className={styles.pre}>
                {JSON.stringify(row.resultJson, null, 2)}
              </pre>
            </div>
          )}
        </section>
      ) : null}

      {/* Exportar PDF */}
      <div className={styles.resetRow}>
        <ExportPdfButton analysisId={row.id} className={styles.btnExport} />
      </div>

      {isAdmin ? (
        <section className={extra.dangerZone}>
          <h2 className={extra.dangerTitle}>Administración</h2>
          <p className={extra.dangerHint}>
            El borrado es permanente y afecta la base de datos en Neon.
          </p>
          <DeleteAnalysisButton
            analysisId={row.id}
            className={extra.deleteBtn}
          />
        </section>
      ) : null}
    </div>
  );
}
