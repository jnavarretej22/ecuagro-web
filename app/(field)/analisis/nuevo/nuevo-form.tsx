"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  MAX_ADDRESS_LEN,
  MAX_CITY_LEN,
  MAX_FIELD_NOTES_LEN,
} from "@/lib/analyses/input-limits";
import LoadingScreen from "@/components/loading-screen";
import styles from "./nuevo.module.css";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

export default function NuevoAnalisisForm() {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [fieldNotes, setFieldNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Selecciona una imagen (JPEG, PNG o WebP).");
      return;
    }
    if (!city.trim() || city.trim().length > MAX_CITY_LEN) {
      setError(`Ciudad obligatoria (máx. ${MAX_CITY_LEN} caracteres).`);
      return;
    }
    if (!address.trim() || address.trim().length > MAX_ADDRESS_LEN) {
      setError(`Dirección obligatoria (máx. ${MAX_ADDRESS_LEN} caracteres).`);
      return;
    }
    if (fieldNotes.length > MAX_FIELD_NOTES_LEN) {
      setError(`Notas demasiado largas (máx. ${MAX_FIELD_NOTES_LEN}).`);
      return;
    }

    setLoading(true);
    try {
      const imageBase64 = await readFileAsDataUrl(file);
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          imageMime: file.type || "image/jpeg",
          city: city.trim(),
          address: address.trim(),
          fieldNotes: fieldNotes.trim() || null,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
        errorMessage?: string;
        retryAfter?: number;
      };
      if (!res.ok) {
        if (res.status === 429) {
          const s =
            typeof data.retryAfter === "number" && data.retryAfter > 0
              ? data.retryAfter
              : 60;
          setError(
            data.error ??
              `Demasiados envíos seguidos. Espera ${s} s e inténtalo de nuevo.`,
          );
          return;
        }
        setError(data.error ?? "No se pudo guardar el análisis");
        return;
      }
      if (data.id) {
        router.push(`/analisis/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("Error de red o al leer la imagen.");
    } finally {
      setLoading(false);
    }
  }

  /* Mientras carga, mostrar la pantalla de loading animada */
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>Nuevo análisis · Cultivo de banano</p>
      <h1 className={styles.title}>
        Sube una foto para<br /><em>analizar tu cultivo</em>
      </h1>
      <p className={styles.hint}>
        La IA analizará enfermedades, plagas y estado nutricional en tiempo real.
        Solo JPEG, PNG o WebP · Máximo 10 MB.
      </p>

      <form className={styles.form} onSubmit={(ev) => void onSubmit(ev)} noValidate>
        {/* Zona de carga de imagen */}
        <label
          className={`${styles.uploadZone} ${file ? styles.hasFile : ""}`}
          htmlFor="campo-foto"
          aria-label="Subir fotografía del cultivo"
        >
          <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {file ? (
            <>
              <div className={styles.uploadTitle}>✓ Imagen seleccionada</div>
              <div className={styles.uploadFileName}>{file.name}</div>
            </>
          ) : (
            <>
              <div className={styles.uploadTitle}>Subir fotografía del cultivo</div>
              <div className={styles.uploadSub}>JPG, PNG, WebP · Máximo 10 MB</div>
            </>
          )}
          <input
            id="campo-foto"
            className={styles.fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            aria-invalid={!!error && !file}
            aria-describedby={error ? "analisis-form-error" : undefined}
            onChange={(ev) => {
              const f = ev.target.files?.[0] ?? null;
              setFile(f);
            }}
          />
        </label>

        <label className={styles.label} htmlFor="campo-ciudad">
          Ciudad o zona
          <input
            id="campo-ciudad"
            className={styles.input}
            value={city}
            onChange={(ev) => setCity(ev.target.value)}
            placeholder="Ej. Babahoyo"
            maxLength={MAX_CITY_LEN}
            autoComplete="address-level2"
            aria-invalid={!!error && !city.trim()}
            aria-required
          />
        </label>

        <label className={styles.label} htmlFor="campo-direccion">
          Dirección o referencia de parcela
          <textarea
            id="campo-direccion"
            className={styles.textarea}
            value={address}
            onChange={(ev) => setAddress(ev.target.value)}
            placeholder="Ej. Km 12 vía Quevedo, finca El Paraíso, lote norte"
            maxLength={MAX_ADDRESS_LEN}
            rows={3}
            aria-invalid={!!error && !address.trim()}
            aria-required
          />
        </label>

        <label className={styles.label} htmlFor="campo-notas">
          Notas de campo{" "}
          <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(opcional)</span>
          <textarea
            id="campo-notas"
            className={styles.textarea}
            value={fieldNotes}
            onChange={(ev) => setFieldNotes(ev.target.value)}
            placeholder="Observaciones adicionales, variedad, edad del racimo…"
            maxLength={MAX_FIELD_NOTES_LEN}
            rows={3}
          />
        </label>

        {error ? (
          <div
            id="analisis-form-error"
            ref={errorRef}
            className={styles.error}
            role="alert"
            tabIndex={-1}
          >
            {error}
          </div>
        ) : null}

        <button
          className={styles.submit}
          type="submit"
          disabled={loading}
          aria-busy={loading}
          id="btn-enviar-analisis"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Enviar análisis
        </button>
      </form>
    </div>
  );
}
