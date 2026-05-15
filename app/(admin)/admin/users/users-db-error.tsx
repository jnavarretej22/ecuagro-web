import Link from "next/link";
import styles from "./users-error.module.css";

export default function UsersDbError() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>No se pudo cargar la lista</h1>
      <p className={styles.text}>
        La aplicación no pudo conectar con la base de datos. Comprueba que{" "}
        <code>DATABASE_URL</code> en <code>.env</code> sea correcta (Neon,
        <code>sslmode=require</code>) y que las migraciones estén aplicadas (
        <code>npx prisma migrate dev</code>).
      </p>
      <p className={styles.text}>
        Reinicia el servidor tras cambiar <code>.env</code>.
      </p>
      <Link className={styles.link} href="/admin">
        Volver al resumen admin
      </Link>
    </div>
  );
}
