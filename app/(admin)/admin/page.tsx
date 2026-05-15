import Link from "next/link";
import styles from "./page.module.css";

export default function AdminHomePage() {
  return (
    <div className={styles.wrap}>
      <p className={styles.eyebrow}>Panel de control · Admin</p>
      <h1 className={styles.title}>
        <em>Administración</em>
      </h1>
      <p className={styles.desc}>
        Gestiona cuentas de analistas de campo y revisores. No hay registro
        público: solo el administrador crea usuarios.
      </p>

      <div className={styles.card}>
        <p className={styles.kicker}>Acceso rápido</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/admin/users">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Gestionar usuarios
          </Link>
          <Link className={styles.link} href="/analisis/nuevo">
            Probar análisis (campo)
          </Link>
          <Link className={styles.link} href="/revision/analisis">
            Auditar análisis
          </Link>
          <Link className={styles.link} href="/">
            Inicio público
          </Link>
        </div>
      </div>
    </div>
  );
}
