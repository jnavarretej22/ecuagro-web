import {
  DIAGNOSTICO_PROMPT_VERSION,
  SYSTEM_PROMPT_DIAGNOSTICO,
} from "./system-prompt";
import {
  preprocessImageForGroq,
  type PreprocessErr,
  type PreprocessOk,
} from "./image-preprocess";
import {
  mapGroqHttpFailure,
  mapGroqNetworkOrUnknown,
  mapGroqResponseBodyNotJson,
  mapModelJsonParseFailure,
  mapModelSchemaFailure,
} from "./friendly-errors";
import { parseJsonFromModelContent } from "./parse-model-json";
import { parseDiagnosticoJson, type DiagnosticoResult } from "./result-schema";

const GROQ_CHAT_COMPLETIONS =
  "https://api.groq.com/openai/v1/chat/completions";

export type AnalyzeImageInput = {
  /** Base64 puro o `data:image/...;base64,...` (omitir si envías `preprocessed`). */
  imageBase64OrDataUri?: string;
  imageMime?: string;
  /** Si viene, se omite el preprocesado interno (misma imagen ya validada). */
  preprocessed?: PreprocessOk;
  city?: string;
  address?: string;
};

export type AnalyzeImageOk = {
  ok: true;
  result: DiagnosticoResult;
  rawAssistantText: string;
  promptVersion: string;
  imageOutWidth: number;
  imageOutHeight: number;
};

export type AnalyzeImageErr = {
  ok: false;
  errorMessage: string;
  rawAssistantText?: string;
};

/**
 * Preprocesa la imagen, llama a Groq (solo servidor; usa `GROQ_API_KEY`) y valida el JSON.
 */
export async function analyzeImageWithGroq(
  input: AnalyzeImageInput,
): Promise<AnalyzeImageOk | AnalyzeImageErr> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      errorMessage: "Falta GROQ_API_KEY en el entorno del servidor.",
    };
  }

  let pre: PreprocessOk | PreprocessErr;
  if (input.preprocessed) {
    pre = input.preprocessed;
  } else {
    const raw = input.imageBase64OrDataUri?.trim();
    if (!raw) {
      return {
        ok: false,
        errorMessage: "Falta imagen (base64 o data URI).",
      };
    }
    pre = await preprocessImageForGroq(raw, input.imageMime);
  }
  if ("error" in pre) {
    return { ok: false, errorMessage: pre.error };
  }

  const { dataUrl, width: imageOutWidth, height: imageOutHeight } = pre;

  const model =
    process.env.GROQ_MODEL?.trim() ||
    "meta-llama/llama-4-scout-17b-16e-instruct";

  const ctx: string[] = [];
  if (input.city?.trim()) ctx.push(`Ciudad / zona: ${input.city.trim()}`);
  if (input.address?.trim()) {
    ctx.push(`Dirección o referencia de parcela: ${input.address.trim()}`);
  }
  const userText =
    ctx.length > 0
      ? `Contexto de campo (texto plano, puede estar incompleto):\n${ctx.join("\n")}\n\nAnaliza la imagen adjunta.`
      : "Analiza la imagen adjunta.";

  const body = {
    model,
    temperature: 0.25,
    max_tokens: 4096,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT_DIAGNOSTICO },
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: userText },
          {
            type: "image_url" as const,
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(GROQ_CHAT_COMPLETIONS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    const rawText = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      return {
        ok: false,
        errorMessage: mapGroqResponseBodyNotJson(res.status),
      };
    }

    if (!res.ok) {
      let errDetail = rawText.slice(0, 800);
      if (
        typeof json === "object" &&
        json !== null &&
        "error" in json &&
        typeof (json as { error?: { message?: string } }).error?.message ===
          "string"
      ) {
        errDetail = (json as { error: { message: string } }).error.message;
      }
      return {
        ok: false,
        errorMessage: mapGroqHttpFailure(res.status, errDetail),
      };
    }

    const o = json as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = o.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return {
        ok: false,
        errorMessage: "Respuesta de Groq sin contenido de texto.",
        rawAssistantText: typeof content === "string" ? content : undefined,
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
      promptVersion: DIAGNOSTICO_PROMPT_VERSION,
      imageOutWidth,
      imageOutHeight,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.toLowerCase().includes("abort") ||
      msg.toLowerCase().includes("timeout")
    ) {
      return {
        ok: false,
        errorMessage: "Tiempo de espera agotado al llamar a Groq.",
      };
    }
    return {
      ok: false,
      errorMessage: mapGroqNetworkOrUnknown(msg),
    };
  }
}
