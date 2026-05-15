import type { AnalyzeImageErr, AnalyzeImageOk } from "@/lib/groq/analyzeImage";
import type { PreprocessOk } from "@/lib/groq/image-preprocess";

export type VisionAnalyzeInput = {
  imageBuffer: Buffer;
  mime: string;
  city: string;
  address: string;
  /**
   * Si la ruta API ya ejecutó `preprocessImageForGroq`, se pasa aquí para no
   * reprocesar la imagen (mismo binario que se guarda en BD).
   */
  preprocessed?: PreprocessOk;
};

export type VisionAnalyzeResult = AnalyzeImageOk | AnalyzeImageErr;
