import Link from "next/link";
import styles from "./error-page.module.css";

export default function NotFound() {
  return (
    <section className={styles.shell}>
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>404</p>
        <h1 className={styles.title}>{"P\u00e1gina no encontrada"}</h1>
        <p className={styles.description}>
          {"La ruta que buscas no existe o ya no est\u00e1 disponible."}
        </p>

        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            Ir al inicio
          </Link>
          <Link href="/catalogo" className={styles.secondary}>
            {"Ver cat\u00e1logo"}
          </Link>
        </div>
      </div>
    </section>
  );
}
