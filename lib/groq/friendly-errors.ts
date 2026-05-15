/**
 * Mensajes en español para el analista / auditoría (no exponer detalles internos innecesarios).
 */

export function mapGroqHttpFailure(status: number, apiDetail: string): string {
  const detail = apiDetail.trim().slice(0, 400);
  if (status === 429) {
    return "El servicio de IA está saturado (demasiadas solicitudes). Espera un minuto e inténtalo de nuevo.";
  }
  if (status === 401 || status === 403) {
    return "La clave de Groq no es válida o no tiene permisos. Revisa GROQ_API_KEY en el servidor.";
  }
  if (status >= 500) {
    return "Groq no está disponible temporalmente (error del servidor). Inténtalo más tarde.";
  }
  if (status === 400) {
    return "La solicitud al modelo no fue aceptada. Revisa el modelo en GROQ_MODEL o el tamaño de la imagen.";
  }
  if (detail) {
    return `No se pudo completar el análisis (HTTP ${status}). ${detail}`;
  }
  return `No se pudo completar el análisis (HTTP ${status}).`;
}

export function mapGroqResponseBodyNotJson(status: number): string {
  if (status === 429) {
    return "El servicio de IA está saturado. Espera un minuto e inténtalo de nuevo.";
  }
  return `El servicio respondió con un error (HTTP ${status}) y sin detalle legible. Inténtalo de nuevo.`;
}

export function mapModelJsonParseFailure(parseErrorMessage: string): string {
  return `El modelo devolvió texto que no es JSON válido. Prueba con otra foto o vuelve a enviar. (${parseErrorMessage.slice(0, 120)})`;
}

export function mapModelSchemaFailure(technicalDetail: string): string {
  const t = technicalDetail.trim().slice(0, 280);
  return `El modelo respondió, pero el resultado no tiene el formato esperado. Prueba con otra imagen o reintenta. Detalle: ${t}`;
}

export function mapGroqNetworkOrUnknown(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("fetch failed") || m.includes("econnrefused")) {
    return "No hubo conexión con Groq desde el servidor. Comprueba red, firewall o DNS.";
  }
  if (m.includes("enotfound") || m.includes("getaddrinfo")) {
    return "No se pudo resolver el nombre del servidor de Groq. Comprueba la conexión a Internet del servidor.";
  }
  return `Error al contactar a Groq: ${message.slice(0, 200)}`;
}
