import { analyzeImageWithGroq } from "@/lib/groq/analyzeImage";
import { preprocessImageForGroq } from "@/lib/groq/image-preprocess";
import type { VisionAnalyzer } from "./vision-analyzer";
import type { VisionAnalyzeInput, VisionAnalyzeResult } from "./types";

export class GroqVisionAnalyzer implements VisionAnalyzer {
  readonly providerId = "groq" as const;

  async analyze(input: VisionAnalyzeInput): Promise<VisionAnalyzeResult> {
    if (input.preprocessed) {
      return analyzeImageWithGroq({
        preprocessed: input.preprocessed,
        city: input.city,
        address: input.address,
      });
    }
    const pre = await preprocessImageForGroq(
      input.imageBuffer.toString("base64"),
      input.mime,
    );
    if ("error" in pre) {
      return { ok: false, errorMessage: pre.error };
    }
    return analyzeImageWithGroq({
      preprocessed: pre,
      city: input.city,
      address: input.address,
    });
  }
}
