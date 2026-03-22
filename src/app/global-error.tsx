"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./error-page.module.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <section className={styles.shell}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow}>Error global</p>
            <h1 className={styles.title}>{"La aplicaci\u00f3n no pudo continuar."}</h1>
            <p className={styles.description}>
              {"Ocurri\u00f3 un fallo general. Puedes reintentar o volver al inicio."}
            </p>

            <div className={styles.actions}>
              <button type="button" onClick={reset} className={styles.primary}>
                Reintentar
              </button>
              <Link href="/" className={styles.secondary}>
                Ir al inicio
              </Link>
            </div>

            {error.message ? (
              <p className={styles.detail}>{"Mensaje t\u00e9cnico registrado:"}</p>
            ) : null}
            {error.message ? <pre className={styles.stack}>{error.message}</pre> : null}
          </div>
        </section>
      </body>
    </html>
  );
}
