import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { homePathForRole } from "@/lib/auth/roles";
import styles from "./page.module.css";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(homePathForRole(session.role));
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Logo */}
        <div className={styles.logoRow} aria-hidden>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22" style={{ position: "relative", zIndex: 1 }}>
              <path d="M12 3C7 3 3 7.5 3 12c0 2.5 1 4.7 2.5 6.3C7 19.8 9.4 21 12 21s5-1.2 6.5-2.7C20 16.7 21 14.5 21 12 21 7.5 17 3 12 3z" fill="#5DCAA5" opacity="0.7"/>
              <path d="M12 3v18M8 7c2 1 3 3 4 5M16 7c-2 1-3 3-4 5M7 13c1.5 0.5 3 0.5 5 0M17 13c-1.5 0.5-3 0.5-5 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={styles.logoName}>
            Ecu<em>Agro</em>Vision
          </span>
        </div>

        <p className={styles.kicker}>Diagnóstico fitosanitario</p>
        <h1 className={styles.title}>
          Análisis de cultivos<br />de <em>banano con IA</em>
        </h1>
        <p className={styles.desc}>
          Plataforma de diagnóstico fitosanitario para técnicos de campo, revisores
          y administradores. Ingresa con tu cuenta para continuar.
        </p>
        <div className={styles.row}>
          <Link className={styles.link} href="/login">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Iniciar sesión
          </Link>
          <Link className={styles.linkSecondary} href="/api/health">
            Estado del sistema
          </Link>
        </div>
      </main>
    </div>
  );
}
