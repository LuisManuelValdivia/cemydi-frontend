"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { requestPasswordReset } from "@/services/auth";
import styles from "../login/login.module.css";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);

  const emailError = useMemo(() => {
    if (!correo.trim()) return "El correo es obligatorio";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return "Correo inválido";
    return "";
  }, [correo]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (emailError) {
      toast.error(emailError);
      return;
    }

    try {
      setLoading(true);
      const normalizedEmail = correo.trim();
      const result = await requestPasswordReset(normalizedEmail);
      sessionStorage.setItem("recovery_email", normalizedEmail);
      toast.success(result.message);
      router.push(`/reset-password?correo=${encodeURIComponent(normalizedEmail)}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo procesar la solicitud.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.authShell}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.overlay} />
          <div className={styles.brandContent}>
            <p>CEMYDI</p>
            <h2>Recupera tu contraseña</h2>
            <span>
              Ingresa tu correo y te enviaremos un código para continuar con el
              restablecimiento.
            </span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h2>¿Olvidaste tu contraseña?</h2>
            <p className={styles.description}>
              Por seguridad, siempre mostraremos el mismo mensaje. Si el correo
              pertenece a una cuenta válida, recibirás un código de verificación.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="correo">Correo electrónico</label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@correo.com"
                className={emailError && correo ? styles.inputError : ""}
              />
              {emailError && correo ? (
                <span className={styles.errorText}>{emailError}</span>
              ) : null}

              <button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Continuar"}
              </button>
            </form>

            <p className={styles.description} style={{ marginTop: "16px" }}>
              Te llevaremos al siguiente paso para ingresar el código OTP y, una
              vez validado, podrás crear tu nueva contraseña.
            </p>

            <Link href="/login" className={styles.forgotLink}>
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
