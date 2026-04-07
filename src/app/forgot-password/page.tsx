"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { requestPasswordReset } from "@/services/auth";

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
const descriptionClassName = "text-sm leading-[1.65] text-gray-600";
const forgotLinkClassName =
  "inline-flex text-[13px] font-semibold text-[#1e6260] no-underline hover:underline";
const primaryButtonClassName =
  "mt-2 h-[46px] rounded-[14px] border-0 bg-[#1e6260] font-bold text-white transition hover:bg-[#18514f] disabled:cursor-not-allowed disabled:opacity-60";

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
    <section className={authShellClassName}>
      <div className={containerClassName}>
        <div className={sideClassName}>
          <div className="absolute inset-0 bg-[url('/fondowan.png')] bg-cover bg-center opacity-[0.85] mix-blend-overlay" />
          <div className={overlayClassName} />
          <div className={brandClassName}>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#dcfce7]">CEMYDI</p>
            <h2 className="mb-2 text-[2rem]">Recupera tu contraseña</h2>
            <span className="text-sm text-[#dcfce7]">
              Ingresa tu correo y te enviaremos un código para continuar con el
              restablecimiento.
            </span>
          </div>
        </div>

        <div className={rightClassName}>
          <div className={cardClassName}>
            <h2 className="mb-2 text-[2rem] text-[#0f3d3b]">¿Olvidaste tu contraseña?</h2>
            <p className={`${descriptionClassName} mb-[18px]`}>
              Por seguridad, siempre mostraremos el mismo mensaje. Si el correo
              pertenece a una cuenta válida, recibirás un código de verificación.
            </p>

            <form onSubmit={handleSubmit} noValidate className="grid gap-2.5">
              <label htmlFor="correo" className="text-sm font-semibold text-[#1f2937]">
                Correo electrónico
              </label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@correo.com"
                className={`${inputClassName} ${emailError && correo ? inputErrorClassName : ""}`}
              />
              {emailError && correo ? (
                <span className={errorTextClassName}>{emailError}</span>
              ) : null}

              <button type="submit" disabled={loading} className={primaryButtonClassName}>
                {loading ? "Enviando..." : "Continuar"}
              </button>
            </form>

            <p className={`${descriptionClassName} mt-4`}>
              Te llevaremos al siguiente paso para ingresar el código OTP y, una
              vez validado, podrás crear tu nueva contraseña.
            </p>

            <Link href="/login" className={`${forgotLinkClassName} mt-4`}>
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
