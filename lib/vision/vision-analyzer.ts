import type { VisionAnalyzeInput, VisionAnalyzeResult } from "./types";

export type VisionProviderId = "groq" | "openai";

export interface VisionAnalyzer {
  readonly providerId: VisionProviderId;
  analyze(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult>;
}
