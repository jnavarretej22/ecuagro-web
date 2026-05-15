"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  analysisId: string;
  className?: string;
};

export default function DeleteAnalysisButton({ analysisId, className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !window.confirm(
        "¿Eliminar este análisis de forma permanente? No se puede deshacer.",
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/analyses/${analysisId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo eliminar");
        return;
      }
      router.push("/revision/analisis");
      router.refresh();
    } catch {
      setError("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error ? (
        <p style={{ color: "#9a3412", fontSize: 14, marginBottom: 8 }}>{error}</p>
      ) : null}
      <button
        type="button"
        className={className}
        onClick={() => void onDelete()}
        disabled={busy}
      >
        {busy ? "Eliminando…" : "Eliminar análisis (admin)"}
      </button>
    </div>
  );
}
