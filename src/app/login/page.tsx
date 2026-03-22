// src/app/login/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, resendVerificationEmail } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import styles from "./login.module.css";
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({
    correo: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    correo: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const verificationStatus = currentUrl.searchParams.get("verified");

    if (!verificationStatus) {
      return;
    }

    if (verificationStatus === "success") {
      toast.success("Tu correo ha sido verificado correctamente.");
    } else if (verificationStatus === "error") {
      toast.error("No se pudo verificar el correo o el enlace ya expiró.");
    }

    currentUrl.searchParams.delete("verified");
    window.history.replaceState({}, "", currentUrl.pathname + currentUrl.search);
  }, []);

  const validate = (name: string, value: string) => {
    let error = "";

    if (name === "correo" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error = "Correo inválido";
    }

    if (name === "password" && !value) {
      error = "La contraseña es obligatoria";
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    validate(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasErrors = Object.values(errors).some((err) => err !== "");
    if (hasErrors) return;

    try {
      setLoading(true);
      setShowResendVerification(false);

      const result = await loginUser(form);

      login({ user: result.user });

      toast.success("Bienvenido");
      if (result.user?.rol === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/perfil");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar sesión. Verifica tus datos.";
      setShowResendVerification(message.toLowerCase().includes("verificar tu correo"));
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!form.correo.trim()) {
      toast.error("Ingresa tu correo para reenviar el enlace.");
      return;
    }

    try {
      setResendingVerification(true);
      const result = await resendVerificationEmail(form.correo);
      toast.success(result.message);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo reenviar el enlace de verificación.";
      toast.error(message);
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <section className={styles.authShell}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.overlay} />
          <div className={styles.brandContent}>
            <p>CEMYDI</p>
            <h2>Bienvenido de vuelta</h2>
            <span>Gestiona tus compras, rentas y perfil en un solo lugar.</span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h2>Iniciar sesión</h2>

            <form onSubmit={handleSubmit} noValidate>
              <label>Correo electrónico</label>
              <input
                type="email"
                name="correo"
                value={form.correo}
                onChange={handleChange}
                className={errors.correo ? styles.inputError : ""}
              />
              {errors.correo && <span className={styles.errorText}>{errors.correo}</span>}

              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={errors.password ? styles.inputError : ""}
              />
              {errors.password && <span className={styles.errorText}>{errors.password}</span>}

              <Link href="/forgot-password" className={styles.forgotLink}>
                ¿Olvidaste tu contraseña?
              </Link>

              <button type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar a mi cuenta"}
              </button>
            </form>

            {showResendVerification ? (
              <div className={styles.secondaryAction}>
                <p>Tu cuenta aún no está verificada.</p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className={styles.secondaryButton}
                >
                  {resendingVerification ? "Reenviando..." : "Reenviar enlace de verificación"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
