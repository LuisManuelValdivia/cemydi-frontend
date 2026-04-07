// src/app/register/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/services/auth";
import toast from "react-hot-toast";

const authShellClassName =
  "min-h-[calc(100vh-120px)] bg-[linear-gradient(180deg,#eef7f6_0%,#f8fbfb_100%)] px-4 py-10";
const containerClassName =
  "mx-auto grid max-w-[1120px] overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-white shadow-[var(--shadow-md)] min-[900px]:grid-cols-2";
const sideClassName =
  "relative hidden min-h-[560px] bg-[linear-gradient(180deg,#1e6260_0%,#0f3d3b_100%)] min-[900px]:block";
const overlayClassName =
  "absolute inset-0 bg-[linear-gradient(to_top,rgba(15,61,59,0.95),rgba(30,98,96,0.35),transparent)]";
const brandClassName =
  "absolute right-[30px] bottom-[30px] left-[30px] z-[2] text-white";
const rightClassName =
  "flex items-center justify-center bg-white px-7 py-7 min-[900px]:px-[46px] min-[900px]:py-[42px]";
const cardClassName = "w-full max-w-[460px]";
const inputClassName =
  "h-11 rounded-[14px] border border-[#d6e5e5] px-3 outline-none focus:border-[#2ba2a1] focus:shadow-[0_0_0_3px_rgba(43,162,161,0.2)]";
const inputErrorClassName = "border-[#ef4444] bg-[#fff7f7]";
const errorTextClassName = "mt-[-4px] text-xs text-[#dc2626]";
const primaryButtonClassName =
  "mt-2 h-[46px] rounded-[14px] border-0 bg-[#1e6260] font-bold text-white transition hover:bg-[#18514f] disabled:cursor-not-allowed disabled:opacity-60";

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

      const result = await registerUser({
        nombre: form.nombre,
        correo: form.correo,
        password: form.password,
      });
      toast.success(result.message);
      await new Promise((resolve) => setTimeout(resolve, 900));
      router.push(`/verify-email?correo=${encodeURIComponent(form.correo)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo registrar la cuenta.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={authShellClassName}>
      <div className={containerClassName}>
        <div className={sideClassName}>
          <div className="absolute inset-0 bg-[url('/fondowan.png')] bg-cover bg-center opacity-[0.85] mix-blend-overlay" />
          <div className={overlayClassName} />
          <div className={brandClassName}>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#dcfce7]">Crea tu cuenta</p>
            <h2 className="mb-2 text-[2rem]">Comienza hoy con CEMYDI</h2>
            <span className="text-sm text-[#dcfce7]">
              Compra o renta productos ortopédicos con seguimiento personalizado.
            </span>
          </div>
        </div>

        <div className={rightClassName}>
          <div className={cardClassName}>
            <h2 className="mb-5 text-[2rem] text-[#0f3d3b]">Crear cuenta</h2>

            <form onSubmit={handleSubmit} noValidate className="grid gap-2.5">
              <label className="text-sm font-semibold text-[#1f2937]">Nombre completo</label>
              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className={`${inputClassName} ${errors.nombre ? inputErrorClassName : ""}`}
              />
              {errors.nombre && <span className={errorTextClassName}>{errors.nombre}</span>}

              <label className="text-sm font-semibold text-[#1f2937]">Correo electrónico</label>
              <input
                type="email"
                name="correo"
                value={form.correo}
                onChange={handleChange}
                className={`${inputClassName} ${errors.correo ? inputErrorClassName : ""}`}
              />
              {errors.correo && <span className={errorTextClassName}>{errors.correo}</span>}

              <label className="text-sm font-semibold text-[#1f2937]">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={`${inputClassName} ${errors.password ? inputErrorClassName : ""}`}
              />
              {errors.password && <span className={errorTextClassName}>{errors.password}</span>}

              <label className="text-sm font-semibold text-[#1f2937]">Confirmar contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`${inputClassName} ${errors.confirmPassword ? inputErrorClassName : ""}`}
              />
              {errors.confirmPassword && (
                <span className={errorTextClassName}>{errors.confirmPassword}</span>
              )}

              <button type="submit" disabled={loading} className={primaryButtonClassName}>
                {loading ? "Registrando..." : "Registrarme"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
