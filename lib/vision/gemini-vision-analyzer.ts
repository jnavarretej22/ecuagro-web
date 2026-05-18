import { SYSTEM_PROMPT_DIAGNOSTICO } from "@/lib/groq/system-prompt";
import {
  mapModelJsonParseFailure,
  mapModelSchemaFailure,
} from "@/lib/groq/friendly-errors";
import { parseJsonFromModelContent } from "@/lib/groq/parse-model-json";
import { parseDiagnosticoJson } from "@/lib/groq/result-schema";
import type { VisionAnalyzer } from "./vision-analyzer";
import type { VisionAnalyzeInput, VisionAnalyzeResult } from "./types";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash-lite";

export class GeminiVisionAnalyzer implements VisionAnalyzer {
  readonly providerId = "gemini" as const;

  async analyze(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return {
        ok: false,
        errorMessage: "Falta GEMINI_API_KEY en el entorno del servidor.",
      };
    }

    const model =
      process.env.GEMINI_MODEL?.trim() || GEMINI_MODEL_DEFAULT;

    const promptVersion =
      (await import("@/lib/groq/system-prompt")).DIAGNOSTICO_PROMPT_VERSION;

    const imageBuffer =
      input.preprocessed?.buffer ?? input.imageBuffer;
    const b64 = imageBuffer.toString("base64");
    const mime = input.preprocessed?.mime ?? input.mime;

    const contextLines: string[] = [];
    if (input.city?.trim())
      contextLines.push(`Ciudad / zona: ${input.city.trim()}`);
    if (input.address?.trim())
      contextLines.push(`Dirección o referencia de parcela: ${input.address.trim()}`);
    const userText =
      contextLines.length > 0
        ? `Contexto de campo:\n${contextLines.join("\n")}\n\nAnaliza la imagen adjunta.`
        : "Analiza la imagen adjunta.";

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT_DIAGNOSTICO }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userText },
            {
              inline_data: {
                mime_type: mime,
                data: b64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.25,
        maxOutputTokens: 4096,
      },
    };

    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout")) {
        return { ok: false, errorMessage: "Tiempo de espera agotado al llamar a Gemini." };
      }
      return { ok: false, errorMessage: `Error al contactar a Gemini: ${msg.slice(0, 200)}` };
    }

    const rawText = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      if (res.status === 429) {
        return {
          ok: false,
          errorMessage:
            "El servicio de IA (Gemini) está saturado. Espera un minuto e inténtalo de nuevo.",
        };
      }
      return {
        ok: false,
        errorMessage: `Gemini respondió HTTP ${res.status} con cuerpo no JSON.`,
      };
    }

    if (!res.ok) {
      const detail =
        (json as { error?: { message?: string } }).error?.message?.trim() ??
        rawText.slice(0, 400);
      if (res.status === 429) {
        return {
          ok: false,
          errorMessage:
            "El servicio de IA (Gemini) está saturado (cuota o rate limit). Espera un momento o cambia de proveedor.",
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          errorMessage:
            "La clave GEMINI_API_KEY no es válida o no tiene permisos.",
        };
      }
      return {
        ok: false,
        errorMessage: `Gemini HTTP ${res.status}: ${detail}`,
      };
    }

    const o = json as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const content = o.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof content !== "string" || !content.trim()) {
      return {
        ok: false,
        errorMessage: "Respuesta de Gemini sin contenido de texto.",
      };
    }

    let parsedUnknown: unknown;
    try {
      parsedUnknown = parseJsonFromModelContent(content);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        errorMessage: mapModelJsonParseFailure(msg),
        rawAssistantText: content,
      };
    }

    const validated = parseDiagnosticoJson(parsedUnknown);
    if (!validated.ok) {
      return {
        ok: false,
        errorMessage: mapModelSchemaFailure(validated.errorMessage),
        rawAssistantText: content,
      };
    }

    return {
      ok: true,
      result: validated.data,
      rawAssistantText: content,
      promptVersion,
      imageOutWidth: input.preprocessed?.width ?? 0,
      imageOutHeight: input.preprocessed?.height ?? 0,
    };
  }
}
