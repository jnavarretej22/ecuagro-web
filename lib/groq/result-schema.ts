import { z } from "zod";

const hallazgoSchema = z
  .object({
    nombre: z.string(),
    nombreCientifico: z.union([z.string(), z.null()]).optional(),
    severidad: z.string(),
    confianza: z.string(),
    descripcion: z.string(),
    /** v2: recomendación de producto cuando severidad >= Moderada. */
    productoRecomendado: z.string().optional(),
    modoAplicacion: z.string().optional(),
    periodoCarencia: z.string().optional(),
    /** v4: hipótesis alternativa cuando confianza es media/baja. */
    diagnosticoDiferencial: z.string().optional(),
  })
  .passthrough();

const pilarSchema = z
  .object({
    hallazgos: z.array(hallazgoSchema).default([]),
    sinHallazgos: z.boolean(),
    nota: z.string().optional().default(""),
  })
  .passthrough();

const planAccionSchema = z
  .object({
    prioridad: z.string(),
    titulo: z.string(),
    detalle: z.string(),
    plazo: z.string(),
    /** v4: categoría MIP — cultural / biológico / químico / monitoreo / regulatorio. */
    categoria: z.string().optional(),
  })
  .passthrough();

/** Contrato mínimo del JSON de diagnóstico (validación tolerante a campos extra). */
export const diagnosticoResultSchema = z
  .object({
    modelo: z.string(),
    confianza: z.number().min(0).max(100),
    diagnosticoPrincipal: z.string(),
    severidad: z.string(),
    pilares: z.object({
      follaje: pilarSchema,
      plagas: pilarSchema,
      nutricion: pilarSchema,
    }),
    diagnosticoIntegrado: z.string(),
    accionUrgente: z.union([z.string(), z.null()]).optional(),
    planAccion: z.array(planAccionSchema),
    disclaimer: z.string(),
    /** v4: nuevos campos opcionales para retro-compatibilidad con análisis previos. */
    calidadImagen: z.string().optional(),
    calidadImagenNota: z.string().optional(),
    estadioFenologico: z.string().optional(),
    recomendacionSeguimiento: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();

export type DiagnosticoResult = z.infer<typeof diagnosticoResultSchema>;

export function parseDiagnosticoJson(
  raw: unknown,
):
  | { ok: true; data: DiagnosticoResult }
  | { ok: false; errorMessage: string } {
  const parsed = diagnosticoResultSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .slice(0, 8)
      .join("; ");
    return {
      ok: false,
      errorMessage: `JSON del modelo no cumple el esquema: ${msg}`,
    };
  }
  return { ok: true, data: parsed.data };
}
