import { GroqVisionAnalyzer } from "./groq-vision-analyzer";
import { OpenAIVisionAnalyzer } from "./openai-vision-analyzer";
import type { VisionAnalyzer } from "./vision-analyzer";

/**
 * Selección de motor de visión por entorno. La UI del analista no cambia.
 * Valores: `groq` (defecto), `openai` (stub hasta implementar la llamada real).
 */
export function createVisionAnalyzer(): VisionAnalyzer {
  const p = process.env.VISION_PROVIDER?.trim().toLowerCase() ?? "";
  if (p === "openai") {
    return new OpenAIVisionAnalyzer();
  }
  return new GroqVisionAnalyzer();
}
