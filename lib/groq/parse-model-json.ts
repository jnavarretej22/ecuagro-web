/** Quita cercas \`\`\`json que a veces devuelve el modelo a pesar de las instrucciones. */
export function stripModelJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```[a-zA-Z0-9]*\s*/u, "")
      .replace(/\s*```$/u, "")
      .trim();
  }
  return t;
}

export function parseJsonFromModelContent(content: string): unknown {
  const cleaned = stripModelJsonFences(content);
  return JSON.parse(cleaned) as unknown;
}
