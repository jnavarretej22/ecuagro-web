import type { VisionAnalyzer } from "./vision-analyzer";
import type { VisionAnalyzeInput, VisionAnalyzeResult } from "./types";

/**
 * Reserva para GPT‑4o u otro modelo OpenAI con visión.
 * Activar con `VISION_PROVIDER=openai` cuando exista implementación real.
 */
export class OpenAIVisionAnalyzer implements VisionAnalyzer {
  readonly providerId = "openai" as const;

  async analyze(_input: VisionAnalyzeInput): Promise<VisionAnalyzeResult> {
    return {
      ok: false,
      errorMessage:
        "Proveedor OpenAI (GPT‑4o) aún no está cableado en esta versión. " +
        "Deja `VISION_PROVIDER=groq` o implementa `OpenAIVisionAnalyzer.analyze`.",
    };
  }
}
