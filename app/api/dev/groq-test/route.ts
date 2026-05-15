import { NextResponse } from "next/server";
import { analyzeImageWithGroq } from "@/lib/groq/analyzeImage";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Prueba manual de Groq + validación JSON. Desactivada por defecto.
 * Activa con `ENABLE_GROQ_TEST_ROUTE=1` en `.env` y reinicia el servidor.
 * No habilitar en producción pública.
 */
export async function POST(request: Request) {
  if (process.env.ENABLE_GROQ_TEST_ROUTE !== "1") {
    return NextResponse.json({ error: "Ruta desactivada" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const imageBase64OrDataUri =
    typeof o.imageBase64 === "string"
      ? o.imageBase64
      : typeof o.imageBase64OrDataUri === "string"
        ? o.imageBase64OrDataUri
        : "";
  const imageMime =
    typeof o.imageMime === "string" ? o.imageMime : undefined;
  const city = typeof o.city === "string" ? o.city : undefined;
  const address = typeof o.address === "string" ? o.address : undefined;

  if (!imageBase64OrDataUri.trim()) {
    return NextResponse.json(
      { error: "Falta imageBase64 o imageBase64OrDataUri" },
      { status: 400 },
    );
  }

  const out = await analyzeImageWithGroq({
    imageBase64OrDataUri,
    imageMime,
    city,
    address,
  });

  if (!out.ok) {
    return NextResponse.json(
      {
        ok: false,
        errorMessage: out.errorMessage,
        rawAssistantText: out.rawAssistantText,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    promptVersion: out.promptVersion,
    imageOutWidth: out.imageOutWidth,
    imageOutHeight: out.imageOutHeight,
    result: out.result,
  });
}
