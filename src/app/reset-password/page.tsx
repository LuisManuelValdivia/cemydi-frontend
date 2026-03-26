"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from "@/services/auth";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const authShellClassName =
  "min-h-[calc(100vh-120px)] bg-[linear-gradient(180deg,#eef7f6_0%,#f8fbfb_100%)] px-3 py-5 min-[521px]:px-4 min-[521px]:py-10";
const containerClassName =
  "mx-auto grid max-w-[1140px] overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-white shadow-[var(--shadow-md)] min-[900px]:grid-cols-[1.02fr_1fr]";
const sideClassName =
  "relative hidden min-h-[600px] bg-[linear-gradient(180deg,#1e6260_0%,#0f3d3b_100%)] min-[900px]:block";
const overlayClassName =
  "absolute inset-0 bg-[linear-gradient(to_top,rgba(15,61,59,0.96),rgba(30,98,96,0.42),transparent)]";
const brandClassName =
  "absolute right-[34px] bottom-[34px] left-[34px] z-[2] text-white";
const rightClassName =
  "flex items-center justify-center bg-white px-3 py-4 min-[521px]:px-6 min-[521px]:py-7 min-[900px]:px-[50px] min-[900px]:py-[46px]";
const cardClassName = "w-full max-w-[480px]";
const inputClassName =
  "h-11 rounded-[14px] border border-[#d6e5e5] bg-white px-3 text-[0.98rem] text-[#0f3d3b] outline-none focus:border-[#2ba2a1] focus:shadow-[0_0_0_3px_rgba(43,162,161,0.2)] min-[521px]:h-12 min-[521px]:px-3.5 min-[521px]:text-base";
const inputErrorClassName = "border-[#ef4444] bg-[#fff7f7]";
const errorTextClassName = "mt-[-4px] text-xs text-[#dc2626]";
const primaryButtonClassName =
  "mt-2 h-[46px] rounded-[14px] border-0 bg-[#1e6260] font-bold text-white transition hover:bg-[#18514f] disabled:cursor-not-allowed disabled:opacity-60 min-[521px]:h-[48px]";
const inlineButtonClassName =
  "inline-flex min-h-0 items-center justify-center rounded-[10px] border border-[#1e6260] bg-transparent px-[10px] py-1 text-[0.78rem] font-bold text-[#1e6260] disabled:cursor-not-allowed disabled:opacity-60";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail =
    searchParams.get("correo") ||
    (typeof window !== "undefined" ? sessionStorage.getItem("recovery_email") : "") ||
    "";

  const [correo, setCorreo] = useState(initialEmail);
  const [otpValues, setOtpValues] = useState<string[]>(
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirm: false,
  });
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const codigo = otpValues.join("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const emailError = useMemo(() => {
    if (!correo.trim()) return "El correo es obligatorio";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return "Correo inválido";
    return "";
  }, [correo]);

  const codeError = useMemo(() => {
    if (!codigo.trim()) return "Ingresa el código completo";
    if (codigo.trim().length !== OTP_LENGTH) return "El código debe tener 6 dígitos";
    return "";
  }, [codigo]);

  const passwordError = useMemo(() => {
    if (!newPassword) return "La nueva contraseña es obligatoria";
    if (newPassword.length < 8) return "La contraseña debe tener al menos 8 caracteres";
    if (newPassword !== confirmPassword) return "Las contraseñas no coinciden";
    return "";
  }, [newPassword, confirmPassword]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextValues = [...otpValues];
    nextValues[index] = digit;
    setOtpValues(nextValues);
    setCodeVerified(false);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (emailError) {
      toast.error(emailError);
      return;
    }

    if (codeError) {
      toast.error(codeError);
      return;
    }

    try {
      setVerifying(true);
      const result = await verifyPasswordResetCode({
        correo,
        codigo,
      });
      setCodeVerified(true);
      toast.success(result.message);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo verificar el código.";
      setCodeVerified(false);
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!codeVerified) {
      toast.error("Primero confirma el código.");
      return;
    }

    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    try {
      setSaving(true);
      const result = await confirmPasswordReset({
        correo,
        codigo,
        newPassword,
      });
      sessionStorage.removeItem("recovery_email");
      toast.success(result.message);
      router.push("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar la contraseña.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;

    if (emailError) {
      toast.error(emailError);
      return;
    }

    try {
      setSaving(true);
      const result = await requestPasswordReset(correo);
      setOtpValues(Array.from({ length: OTP_LENGTH }, () => ""));
      setCodeVerified(false);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
      toast.success(result.message);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo reenviar el código.";
      toast.error(message);
    } finally {
      setSaving(false);
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
            <h2 className="mb-2 text-[2rem]">Restablece tu contraseña</h2>
            <span className="text-sm text-[#dcfce7]">
              Primero confirma el código OTP y después define una nueva contraseña.
            </span>
          </div>
        </div>

        <div className={rightClassName}>
          <div className={cardClassName}>
            <div className="mb-4 inline-flex size-[66px] items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,rgba(43,162,161,0.14),rgba(30,98,96,0.08))] text-[#1e6260]">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                <rect x="5" y="10" width="14" height="10" rx="2" />
              </svg>
            </div>
            <h2 className="mb-2 text-[2rem] text-[#0f3d3b]">
              {codeVerified ? "Nueva contraseña" : "Ingresa el OTP"}
            </h2>
            <p className="mb-4 text-sm leading-[1.65] text-gray-600">
              {codeVerified
                ? "El código fue validado correctamente. Ahora crea tu nueva contraseña."
                : "Escribe el código que enviamos a tu correo para continuar."}
            </p>
            <span className="mb-[18px] inline-flex items-center rounded-full bg-[#eef7f6] px-3 py-2 text-xs font-bold text-[#1e6260]">
              Proceso seguro de recuperación
            </span>

            {!codeVerified ? (
              <form onSubmit={handleVerifyCode} noValidate className="grid gap-2.5">
                <label htmlFor="correo" className="text-sm font-semibold text-gray-800">
                  Correo electrónico
                </label>
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    setCodeVerified(false);
                  }}
                  autoComplete="email"
                  className={`${inputClassName} ${emailError ? inputErrorClassName : ""}`}
                />
                {emailError ? (
                  <span className={errorTextClassName}>{emailError}</span>
                ) : null}

                <label className="text-sm font-semibold text-gray-800">Código OTP</label>
                <div className="grid w-full grid-cols-6 gap-2 min-[521px]:gap-2.5">
                  {otpValues.map((value, index) => (
                    <input
                      key={index}
                      ref={(node) => {
                        inputRefs.current[index] = node;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={value}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      aria-label={`Dígito ${index + 1} del código OTP`}
                      className="h-[46px] min-w-0 rounded-[14px] border border-[#d6e5e5] bg-white text-center text-[19px] font-bold text-[#0f3d3b] outline-none focus:border-[#2ba2a1] focus:shadow-[0_0_0_3px_rgba(43,162,161,0.2)] min-[521px]:h-[52px] min-[521px]:text-[22px]"
                    />
                  ))}
                </div>
                {codeError && codigo ? (
                  <span className={errorTextClassName}>{codeError}</span>
                ) : null}

                <button type="submit" disabled={verifying} className={primaryButtonClassName}>
                  {verifying ? "Verificando..." : "Continuar"}
                </button>

                <p className="mt-3 text-center text-sm leading-[1.6] text-gray-600">
                  ¿No recibiste el código?{" "}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={saving || cooldown > 0}
                    className={inlineButtonClassName}
                  >
                    {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSavePassword} noValidate className="grid gap-2.5">
                <label htmlFor="newPassword" className="text-sm font-semibold text-gray-800">
                  Nueva contraseña
                </label>
                <div className="relative w-full">
                  <input
                    id="newPassword"
                    type={showPasswords.password ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${inputClassName} w-full pr-[68px] ${
                      passwordError ? inputErrorClassName : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((current) => ({
                        ...current,
                        password: !current.password,
                      }))
                    }
                    className="absolute top-1/2 right-3 min-h-0 min-w-0 -translate-y-1/2 border-0 bg-transparent p-0 text-[0.82rem] font-bold text-gray-500"
                  >
                    {showPasswords.password ? "Ocultar" : "Ver"}
                  </button>
                </div>

                <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-800">
                  Confirmar contraseña
                </label>
                <div className="relative w-full">
                  <input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${inputClassName} w-full pr-[68px] ${
                      passwordError ? inputErrorClassName : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((current) => ({
                        ...current,
                        confirm: !current.confirm,
                      }))
                    }
                    className="absolute top-1/2 right-3 min-h-0 min-w-0 -translate-y-1/2 border-0 bg-transparent p-0 text-[0.82rem] font-bold text-gray-500"
                  >
                    {showPasswords.confirm ? "Ocultar" : "Ver"}
                  </button>
                </div>
                {passwordError ? (
                  <span className={errorTextClassName}>{passwordError}</span>
                ) : null}

                <button type="submit" disabled={saving} className={primaryButtonClassName}>
                  {saving ? "Actualizando..." : "Guardar contraseña"}
                </button>
              </form>
            )}

            <Link
              href="/forgot-password"
              className="mt-[18px] inline-flex text-sm font-bold text-[#1e6260] no-underline hover:underline"
            >
              Volver al paso anterior
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<section className={authShellClassName} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
