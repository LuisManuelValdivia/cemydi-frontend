"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { confirmEmailVerification, resendVerificationEmail } from "@/services/auth";
import styles from "../login/login.module.css";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const correo = searchParams.get("correo") ?? "";

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    token ? "loading" : "idle"
  );
  const [message, setMessage] = useState(
    token
      ? "Estamos verificando tu correo..."
      : "Te enviamos un enlace de verificación a tu correo."
  );
  const [loadingResend, setLoadingResend] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const run = async () => {
      try {
        const result = await confirmEmailVerification(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(result.message);
        toast.success(result.message);
      } catch (err: unknown) {
        if (cancelled) return;
        const nextMessage =
          err instanceof Error ? err.message : "No se pudo verificar el correo.";
        setStatus("error");
        setMessage(nextMessage);
        toast.error(nextMessage);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    if (!correo) {
      toast.error("No encontramos el correo para reenviar el enlace.");
      return;
    }

    try {
      setLoadingResend(true);
      const result = await resendVerificationEmail(correo);
      toast.success(result.message);
    } catch (err: unknown) {
      const nextMessage =
        err instanceof Error ? err.message : "No se pudo reenviar el enlace.";
      toast.error(nextMessage);
    } finally {
      setLoadingResend(false);
    }
  };

  return (
    <section className={styles.authShell}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.overlay} />
          <div className={styles.brandContent}>
            <p>CEMYDI</p>
            <h2>Verifica tu correo</h2>
            <span>Confirma tu cuenta para poder iniciar sesión.</span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h2>Verificación de correo</h2>
            <p className={styles.description}>{message}</p>

            {status === "loading" ? <p className={styles.statusText}>Validando enlace...</p> : null}
            {status === "success" ? (
              <Link href="/login" className={styles.primaryLink}>
                Ir a iniciar sesión
              </Link>
            ) : null}

            {!token ? (
              <div className={styles.secondaryAction}>
                <p>Si no encuentras el mensaje, puedes pedir otro enlace.</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loadingResend || !correo}
                  className={styles.secondaryButton}
                >
                  {loadingResend ? "Reenviando..." : "Reenviar enlace"}
                </button>
              </div>
            ) : null}

            {status === "error" ? (
              <div className={styles.secondaryAction}>
                <p>El enlace ya no es válido. Puedes solicitar uno nuevo.</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loadingResend || !correo}
                  className={styles.secondaryButton}
                >
                  {loadingResend ? "Reenviando..." : "Reenviar enlace"}
                </button>
              </div>
            ) : null}

            <Link href="/login" className={styles.forgotLink}>
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<section className={styles.authShell} />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
