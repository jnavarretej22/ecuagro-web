import { NextResponse } from "next/server";
import { SESSION_SECRET_MIN_LENGTH } from "./session-env";

/** Respuesta HTML legible cuando falta configuración de sesión (evita “página en blanco”). */
export function sessionSecretMissingNextResponse(): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Configuración · EcuAgroVision</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.5; }
    code { background: #f4f4f0; padding: 0.15rem 0.4rem; border-radius: 4px; }
    h1 { font-size: 1.25rem; color: #1e5c35; }
  </style>
</head>
<body>
  <h1>Sesión no configurada</h1>
  <p>
    Añade en <code>ecuagro-web/.env</code> una variable
    <code>SESSION_SECRET</code> con <strong>al menos ${SESSION_SECRET_MIN_LENGTH} caracteres</strong>
    (sin comillas al pegar, o con comillas consistentes). Luego <strong>reinicia</strong>
    el servidor (<code>npm run dev</code>).
  </p>
  <p>Si ya existe, revisa que no tenga espacios al inicio/final ni menos de ${SESSION_SECRET_MIN_LENGTH} caracteres.</p>
</body>
</html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
