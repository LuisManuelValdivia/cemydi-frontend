// src/app/login/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, resendVerificationEmail } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
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
const forgotLinkClassName =
  "justify-self-end text-[13px] font-semibold text-[#1e6260] no-underline hover:underline";
const primaryButtonClassName =
  "mt-2 h-[46px] rounded-[14px] border-0 bg-[#1e6260] font-bold text-white transition hover:bg-[#18514f] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryActionClassName = "mt-4 grid gap-2.5";
const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#1e6260] bg-transparent px-3.5 font-bold text-[#1e6260] disabled:cursor-not-allowed disabled:opacity-60";

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

      if (result.accessToken) {
        document.cookie = `cemydi_access=${result.accessToken}; path=/; max-age=86400; secure; samesite=lax`;
      }

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
    <section className={authShellClassName}>
      <div className={containerClassName}>
        <div className={sideClassName}>
          <div className="absolute inset-0 bg-[url('/fondowan.png')] bg-cover bg-center opacity-[0.85] mix-blend-overlay" />
          <div className={overlayClassName} />
          <div className={brandClassName}>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#dcfce7]">CEMYDI</p>
            <h2 className="mb-2 text-[2rem]">Bienvenido de vuelta</h2>
            <span className="text-sm text-[#dcfce7]">
              Gestiona tus compras, rentas y perfil en un solo lugar.
            </span>
          </div>
        </div>

        <div className={rightClassName}>
          <div className={cardClassName}>
            <h2 className="mb-5 text-[2rem] text-[#0f3d3b]">Iniciar sesión</h2>

            <form onSubmit={handleSubmit} noValidate className="grid gap-2.5">
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

              <Link href="/forgot-password" className={forgotLinkClassName}>
                ¿Olvidaste tu contraseña?
              </Link>

              <button type="submit" disabled={loading} className={primaryButtonClassName}>
                {loading ? "Entrando..." : "Entrar a mi cuenta"}
              </button>
            </form>

            {showResendVerification ? (
              <div className={secondaryActionClassName}>
                <p className="m-0 text-sm text-[#4b5563]">Tu cuenta aún no está verificada.</p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className={secondaryButtonClassName}
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
