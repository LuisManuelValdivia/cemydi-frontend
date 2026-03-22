"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import styles from "../login/login.module.css";

export default function ForgotPasswordPage() {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validarCorreo = (value: string) => {
    if (!value.trim()) {
      return "El correo es obligatorio";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Correo inválido";
    }

    return "";
  };

  const handleChange = (value: string) => {
    setCorreo(value);
    setError(validarCorreo(value));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextError = validarCorreo(correo);
    setError(nextError);

    if (nextError) {
      return;
    }

    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Pantalla lista. Falta conectar el endpoint de recuperación.");
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
            <h2>Recupera el acceso a tu cuenta</h2>
            <span>
              Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña.
            </span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h2>Restablecer contraseña</h2>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="correo">Correo electrónico</label>
              <input
                id="correo"
                type="email"
                name="correo"
                value={correo}
                onChange={(e) => handleChange(e.target.value)}
                className={error ? styles.inputError : ""}
              />
              {error && <span className={styles.errorText}>{error}</span>}

              <button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar instrucciones"}
              </button>
            </form>

            <Link href="/login" className={styles.forgotLink}>
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
