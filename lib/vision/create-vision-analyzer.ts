import { GeminiVisionAnalyzer } from "./gemini-vision-analyzer";
import { GroqVisionAnalyzer } from "./groq-vision-analyzer";
import { OpenAIVisionAnalyzer } from "./openai-vision-analyzer";
import type { VisionAnalyzer } from "./vision-analyzer";

/**
 * Selección de motor de visión por variable de entorno VISION_PROVIDER.
 *
 * Valores:
 *   gemini  → GeminiVisionAnalyzer (GEMINI_API_KEY + GEMINI_MODEL)
 *   openai  → OpenAIVisionAnalyzer (stub; implementar cuando se active)
 *   groq    → GroqVisionAnalyzer  (GROQ_API_KEY + GROQ_MODEL)
 *
 * Si VISION_PROVIDER está vacío o no se reconoce, cae en "gemini" si existe
 * GEMINI_API_KEY, y en "groq" como último fallback.
 */
export function createVisionAnalyzer(): VisionAnalyzer {
  const p = process.env.VISION_PROVIDER?.trim().toLowerCase() ?? "";

  if (p === "openai") return new OpenAIVisionAnalyzer();
  if (p === "groq") return new GroqVisionAnalyzer();
  if (p === "gemini") return new GeminiVisionAnalyzer();

  // Sin variable explícita: usa Gemini si hay key, si no Groq.
  if (process.env.GEMINI_API_KEY?.trim()) return new GeminiVisionAnalyzer();
  return new GroqVisionAnalyzer();
}
