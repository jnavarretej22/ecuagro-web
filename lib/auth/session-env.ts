/** Longitud mínima acordada con `middleware` y firma JWT. */
export const SESSION_SECRET_MIN_LENGTH = 32;

/**
 * Secreto listo para `jose` / middleware, o `null` si falta o es demasiado corto.
 * Se aplica `.trim()` para evitar fallos por espacios o saltos al pegar en `.env`.
 */
export function getSessionSecretBytesOrNull(): Uint8Array | null {
  const s = process.env.SESSION_SECRET?.trim();
  if (!s || s.length < SESSION_SECRET_MIN_LENGTH) return null;
  return new TextEncoder().encode(s);
}
