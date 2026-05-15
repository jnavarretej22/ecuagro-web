import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { requireFieldOrAdminSession } from "@/lib/auth/require-field-or-admin";
import styles from "./field-layout.module.css";

export default async function FieldAnalisisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireFieldOrAdminSession();
  if (!session) {
    redirect("/login?next=/analisis");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {/* Logo */}
        <Link href="/analisis" className={styles.logoWrap}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22" style={{ position: "relative", zIndex: 1 }}>
              <path d="M12 3C7 3 3 7.5 3 12c0 2.5 1 4.7 2.5 6.3C7 19.8 9.4 21 12 21s5-1.2 6.5-2.7C20 16.7 21 14.5 21 12 21 7.5 17 3 12 3z" fill="#5DCAA5" opacity="0.7"/>
              <path d="M12 3v18M8 7c2 1 3 3 4 5M16 7c-2 1-3 3-4 5M7 13c1.5 0.5 3 0.5 5 0M17 13c-1.5 0.5-3 0.5-5 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <span className={styles.logoText}>
              Ecu<em className={styles.logoEm}>Agro</em>Vision
            </span>
            <span className={styles.logoPill}>Campo</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className={styles.nav}>
          <Link className={styles.navLink} href="/analisis">
            Mis análisis
          </Link>
          <Link className={styles.navLink} href="/analisis/nuevo">
            Nuevo análisis
          </Link>
          <LogoutButton className={styles.logoutBtn} />
        </nav>
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
