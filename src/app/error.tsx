"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./error-page.module.css";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className={styles.shell}>
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>Error</p>
        <h1 className={styles.title}>{"No pudimos cargar esta secci\u00f3n."}</h1>
        <p className={styles.description}>
          {"Ocurri\u00f3 un problema inesperado. Puedes intentarlo de nuevo o volver al inicio."}
        </p>

        <div className={styles.actions}>
          <button type="button" onClick={reset} className={styles.primary}>
            Intentar de nuevo
          </button>
          <Link href="/" className={styles.secondary}>
            Volver al inicio
          </Link>
        </div>

        {error.message ? (
          <p className={styles.detail}>{"Mensaje t\u00e9cnico registrado:"}</p>
        ) : null}
        {error.message ? <pre className={styles.stack}>{error.message}</pre> : null}
      </div>
    </section>
  );
}
