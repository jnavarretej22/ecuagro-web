"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import styles from "./login.module.css";

type Props = { nextPath?: string };

export default function LoginForm({ nextPath }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorHint(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        redirect?: string;
        error?: string;
        hint?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        setErrorHint(typeof data.hint === "string" ? data.hint : null);
        return;
      }
      const target =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : (data.redirect ?? "/");
      router.push(target);
      router.refresh();
    } catch {
      setErrorHint(null);
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Panel visual izquierdo ──────────────────────────────────── */}
      <div className={styles.visual}>
        <div className={styles.visualGlow} />
        <div className={styles.visualGlow2} />
        <div className={styles.visualContent}>
          <div className={styles.visualIcon}>
            <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
              <path d="M12 3C7 3 3 7.5 3 12c0 2.5 1 4.7 2.5 6.3C7 19.8 9.4 21 12 21s5-1.2 6.5-2.7C20 16.7 21 14.5 21 12 21 7.5 17 3 12 3z" fill="#5DCAA5" opacity="0.5"/>
              <path d="M12 3v18M8 7c2 1 3 3 4 5M16 7c-2 1-3 3-4 5M7 13c1.5 0.5 3 0.5 5 0M17 13c-1.5 0.5-3 0.5-5 0" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div className={styles.visualEyebrow}>Diagnóstico fitosanitario</div>
          <h1 className={styles.visualTitle}>
            Cultivos de banano<br />con <em>IA avanzada</em>
          </h1>
          <p className={styles.visualDesc}>
            Plataforma de análisis fitosanitario para técnicos de campo, revisores
            y administradores.
          </p>
          <div className={styles.visualFeats}>
            <div className={styles.visualFeat}>
              <div className={styles.visualFeatNum}>3</div>
              <div className={styles.visualFeatLabel}>Pilares diagnósticos</div>
            </div>
            <div className={styles.visualFeat}>
              <div className={styles.visualFeatNum}>IA</div>
              <div className={styles.visualFeatLabel}>Análisis real</div>
            </div>
            <div className={styles.visualFeat}>
              <div className={styles.visualFeatNum}>EC</div>
              <div className={styles.visualFeatLabel}>Español Ecuador</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel formulario ────────────────────────────────────────── */}
      <div className={styles.formSide}>
        <div className={styles.card}>
          {/* Logo móvil */}
          <div className={styles.logoMobile} aria-hidden>
            <div className={styles.logoMobileIcon}>
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M12 3C7 3 3 7.5 3 12c0 2.5 1 4.7 2.5 6.3C7 19.8 9.4 21 12 21s5-1.2 6.5-2.7C20 16.7 21 14.5 21 12 21 7.5 17 3 12 3z" fill="#5DCAA5" opacity="0.7"/>
                <path d="M12 3v18M8 7c2 1 3 3 4 5M16 7c-2 1-3 3-4 5M7 13c1.5 0.5 3 0.5 5 0M17 13c-1.5 0.5-3 0.5-5 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className={styles.logoMobileText}>
              Ecu<em>Agro</em>Vision
            </span>
          </div>

          <p className={styles.kicker}>Acceso al sistema</p>
          <h2 className={styles.title}>Iniciar sesión</h2>
          <p className={styles.hint}>
            Ingresa con las credenciales de tu cuenta.
          </p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>
              Usuario
              <input
                className={styles.input}
                name="username"
                autoComplete="username"
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                required
                id="login-username"
              />
            </label>
            <label className={styles.label}>
              Contraseña
              <input
                className={styles.input}
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                required
                id="login-password"
              />
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            {errorHint ? <p className={styles.errorHint}>{errorHint}</p> : null}
            <button className={styles.submit} type="submit" disabled={loading} id="login-submit">
              {loading ? "Verificando…" : "Entrar"}
              {!loading && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </form>
          <p className={styles.footer}>
            <Link href="/">← Volver al inicio</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
