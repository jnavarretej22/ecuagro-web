import sharp from "sharp";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** Tamaño máximo del binario decodificado antes de redimensionar (8 MiB). */
export const MAX_IMAGE_BYTES_BEFORE = 8 * 1024 * 1024;

/** Arista máxima tras redimensionar (px). */
export const MAX_EDGE_PX = 960;

export type PreprocessOk = {
  buffer: Buffer;
  mime: "image/jpeg";
  dataUrl: string;
  width: number;
  height: number;
};

export type PreprocessErr = { error: string };

function normalizeMime(m: string): string {
  const x = m.split(";")[0]?.trim().toLowerCase() ?? "";
  if (x === "image/jpg") return "image/jpeg";
  return x;
}

/** Separa `data:mime;base64,...` o devuelve null si no hay prefijo data. */
export function splitDataUri(
  input: string,
): { mime: string; base64: string } | null {
  const m = input.trim().match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (!m) return null;
  return { mime: normalizeMime(m[1]), base64: m[2].replace(/\s/g, "") };
}

/**
 * Valida tipo y tamaño, decodifica base64, redimensiona (máx. arista MAX_EDGE_PX)
 * y normaliza a JPEG para enviar a la API de visión.
 */
export async function preprocessImageForGroq(
  imageBase64OrDataUri: string,
  declaredMime?: string,
): Promise<PreprocessOk | PreprocessErr> {
  const dataUri = splitDataUri(imageBase64OrDataUri);
  let mime: string;
  let b64: string;
  if (dataUri) {
    mime = dataUri.mime;
    b64 = dataUri.base64;
  } else {
    b64 = imageBase64OrDataUri.replace(/\s/g, "");
    if (!declaredMime) {
      return { error: "Sin prefijo data: URI debe indicarse imageMime." };
    }
    mime = normalizeMime(declaredMime);
  }

  if (!ALLOWED_MIMES.has(mime)) {
    return {
      error: `Tipo de imagen no permitido (${mime}). Use JPEG, PNG o WebP.`,
    };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    return { error: "Base64 de imagen inválido." };
  }

  if (buffer.length === 0) {
    return { error: "Imagen vacía." };
  }
  if (buffer.length > MAX_IMAGE_BYTES_BEFORE) {
    return {
      error: `Imagen demasiado grande (${buffer.length} bytes). Máximo ${MAX_IMAGE_BYTES_BEFORE} bytes.`,
    };
  }

  try {
    const resized = await sharp(buffer)
      .rotate()
      .resize(MAX_EDGE_PX, MAX_EDGE_PX, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    const out = resized.data;
    const w = resized.info.width ?? 0;
    const h = resized.info.height ?? 0;
    const dataUrl = `data:image/jpeg;base64,${out.toString("base64")}`;
    return {
      buffer: out,
      mime: "image/jpeg",
      dataUrl,
      width: w,
      height: h,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `No se pudo procesar la imagen: ${msg}` };
  }
}
