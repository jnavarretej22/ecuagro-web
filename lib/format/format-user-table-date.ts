/**
 * Fecha legible es-EC para tablas. Solo usar en Server Components o rutas API
 * para evitar desajustes de hidratación (Node vs navegador pueden diferir en NBSP).
 */
export function formatUserTableDate(d: Date): string {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  })
    .format(d)
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ");
}
