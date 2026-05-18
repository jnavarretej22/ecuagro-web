import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  MAX_ADDRESS_LEN,
  MAX_CITY_LEN,
  MAX_FIELD_NOTES_LEN,
} from "@/lib/analyses/input-limits";
import { requireFieldOrAdminSession } from "@/lib/auth/require-field-or-admin";
import { DIAGNOSTICO_PROMPT_VERSION } from "@/lib/groq/system-prompt";
import { preprocessImageForGroq } from "@/lib/groq/image-preprocess";
import { prisma } from "@/lib/db/prisma";
import { consumeAnalysisPostSlot } from "@/lib/rate-limit/analysis-post-limit";
import { createVisionAnalyzer } from "@/lib/vision/create-vision-analyzer";

export const runtime = "nodejs";
export const maxDuration = 120;

const GROQ_MODEL_DEFAULT = "meta-llama/llama-4-scout-17b-16e-instruct";
const OPENAI_VISION_MODEL_DEFAULT = "gpt-4o";
const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash-lite";

export async function POST(request: Request) {
  const session = await requireFieldOrAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const imageBase64 =
    typeof o.imageBase64 === "string"
      ? o.imageBase64
      : typeof o.imageBase64OrDataUri === "string"
        ? o.imageBase64OrDataUri
        : "";
  const imageMime =
    typeof o.imageMime === "string" ? o.imageMime : undefined;
  const city = typeof o.city === "string" ? o.city.trim() : "";
  const address = typeof o.address === "string" ? o.address.trim() : "";
  const fieldNotesRaw = o.fieldNotes;
  const fieldNotes =
    typeof fieldNotesRaw === "string" && fieldNotesRaw.trim()
      ? fieldNotesRaw.trim()
      : null;

  if (!imageBase64) {
    return NextResponse.json(
      { error: "Falta imageBase64 o data URI de la imagen." },
      { status: 400 },
    );
  }
  if (!city || city.length > MAX_CITY_LEN) {
    return NextResponse.json(
      {
        error: `Ciudad obligatoria y máximo ${MAX_CITY_LEN} caracteres.`,
      },
      { status: 400 },
    );
  }
  if (!address || address.length > MAX_ADDRESS_LEN) {
    return NextResponse.json(
      {
        error: `Dirección obligatoria y máximo ${MAX_ADDRESS_LEN} caracteres.`,
      },
      { status: 400 },
    );
  }
  if (fieldNotes && fieldNotes.length > MAX_FIELD_NOTES_LEN) {
    return NextResponse.json(
      {
        error: `Notas de campo máximo ${MAX_FIELD_NOTES_LEN} caracteres.`,
      },
      { status: 400 },
    );
  }

  const rate = consumeAnalysisPostSlot(session.userId);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error:
          "Has enviado demasiados análisis en poco tiempo. Espera un momento e inténtalo de nuevo.",
        retryAfter: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const pre = await preprocessImageForGroq(imageBase64, imageMime);
  if ("error" in pre) {
    return NextResponse.json({ error: pre.error }, { status: 400 });
  }

  const imageB64Db = pre.buffer.toString("base64");
  const analyzer = createVisionAnalyzer();
  const modelStored =
    analyzer.providerId === "openai"
      ? process.env.OPENAI_VISION_MODEL?.trim() || OPENAI_VISION_MODEL_DEFAULT
      : analyzer.providerId === "gemini"
        ? process.env.GEMINI_MODEL?.trim() || GEMINI_MODEL_DEFAULT
        : process.env.GROQ_MODEL?.trim() || GROQ_MODEL_DEFAULT;

  const analysis = await analyzer.analyze({
    imageBuffer: pre.buffer,
    mime: pre.mime,
    city,
    address,
    preprocessed: pre,
  });

  const resultJson = analysis.ok
    ? (JSON.parse(JSON.stringify(analysis.result)) as Prisma.InputJsonValue)
    : undefined;

  const row = await prisma.analysis.create({
    data: {
      userId: session.userId,
      city,
      address,
      fieldNotes,
      imageBase64: imageB64Db,
      imageMime: "image/jpeg",
      imageWidth: pre.width,
      imageHeight: pre.height,
      provider: analyzer.providerId,
      model: modelStored,
      ...(resultJson !== undefined ? { resultJson } : {}),
      errorMessage: analysis.ok ? null : analysis.errorMessage,
      promptVersion: DIAGNOSTICO_PROMPT_VERSION,
    },
    select: { id: true },
  });

  return NextResponse.json(
    {
      ok: true,
      id: row.id,
      analysisOk: analysis.ok,
      errorMessage: analysis.ok ? undefined : analysis.errorMessage,
    },
    { status: 201 },
  );
}
