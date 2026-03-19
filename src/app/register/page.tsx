// src/app/register/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/services/auth";
import toast from "react-hot-toast";
import styles from "./register.module.css";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    nombre: "",
    correo: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const validate = (name: string, value: string) => {
    let error = "";

    if (name === "nombre") {
      if (value.length < 3) {
        error = "Debe tener mínimo 3 caracteres";
      } else if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/.test(value)) {
        error = "Solo se permiten letras";
      }
    }

    if (name === "correo") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = "Correo inválido";
      }
    }

    if (name === "password") {
      if (value.length < 8) {
        error = "Mínimo 8 caracteres";
      } else if (!/(?=.*[A-Z])/.test(value)) {
        error = "Debe contener una mayúscula";
      } else if (!/(?=.*\d)/.test(value)) {
        error = "Debe contener un número";
      } else if (!/(?=.*[\W_])/.test(value)) {
        error = "Debe contener un símbolo";
      }
    }

    if (name === "confirmPassword") {
      if (value !== form.password) {
        error = "Las contraseñas no coinciden";
      }
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

      await registerUser({
        nombre: form.nombre,
        correo: form.correo,
        password: form.password,
      });
      toast.success("Cuenta creada correctamente. Redirigiendo al login...");
      await new Promise((resolve) => setTimeout(resolve, 900));
      router.push("/login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo registrar la cuenta.";
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
            <p>Crea tu cuenta</p>
            <h2>Comienza hoy con CEMYDI</h2>
            <span>Compra o renta productos ortopédicos con seguimiento personalizado.</span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h2>Crear cuenta</h2>

            <form onSubmit={handleSubmit} noValidate>
              <label>Nombre completo</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className={errors.nombre ? styles.inputError : ""}
              />
              {errors.nombre && <span className={styles.errorText}>{errors.nombre}</span>}

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

              <label>Confirmar contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? styles.inputError : ""}
              />
              {errors.confirmPassword && (
                <span className={styles.errorText}>{errors.confirmPassword}</span>
              )}

              <button type="submit" disabled={loading}>
                {loading ? "Registrando..." : "Registrarme"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
