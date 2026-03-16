// src/app/login/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
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

  const validate = (name: string, value: string) => {
    let error = "";

    if (name === "correo") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = "Correo inválido";
      }
    }

    if (name === "password") {
      if (!value) {
        error = "La contraseña es obligatoria";
      }
    }

    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value,
    }));

    validate(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasErrors = Object.values(errors).some(err => err !== "");
    if (hasErrors) return;

    try {
      setLoading(true);

      const result = await loginUser(form);

      login({ user: result.user, token: result.access_token });

      if (result.user?.rol === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/perfil");
      }
    } catch {
      alert("Credenciales incorrectas.");
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
            <h2>Bienvenido de vuelta</h2>
            <span>Gestiona tus compras, rentas y perfil en un solo lugar.</span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h2>Iniciar Sesión</h2>

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

              <button type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar a mi cuenta"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
