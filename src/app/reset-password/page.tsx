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
import styles from "../login/login.module.css";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const otpRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "10px",
  width: "100%",
};

const otpInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: "48px",
  border: "1px solid #d6e5e5",
  borderRadius: "14px",
  textAlign: "center",
  fontSize: "1.15rem",
  fontWeight: 700,
  color: "#0f3d3b",
  background: "#fff",
  outline: "none",
};

const passwordFieldStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const passwordInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  paddingRight: "68px",
};

const revealButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  right: "12px",
  transform: "translateY(-50%)",
  border: "none",
  background: "transparent",
  color: "#6b7280",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: "pointer",
  minWidth: "auto",
  minHeight: "auto",
  padding: 0,
  margin: 0,
};

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
    <section className={styles.authShell}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.overlay} />
          <div className={styles.brandContent}>
            <p>CEMYDI</p>
            <h2>Restablece tu contraseña</h2>
            <span>
              Primero confirma el código OTP y después define una nueva contraseña.
            </span>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <h2>{codeVerified ? "Nueva contraseña" : "Ingresa el OTP"}</h2>
            <p className={styles.description}>
              {codeVerified
                ? "El código fue validado correctamente. Ahora crea tu nueva contraseña."
                : "Escribe el código que enviamos a tu correo para continuar."}
            </p>

            {!codeVerified ? (
              <form onSubmit={handleVerifyCode} noValidate>
                <label htmlFor="correo">Correo electrónico</label>
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    setCodeVerified(false);
                  }}
                  className={emailError ? styles.inputError : ""}
                />
                {emailError ? <span className={styles.errorText}>{emailError}</span> : null}

                <label>Código OTP</label>
                <div style={otpRowStyle}>
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
                      style={otpInputStyle}
                    />
                  ))}
                </div>
                {codeError && codigo ? <span className={styles.errorText}>{codeError}</span> : null}

                <button type="submit" disabled={verifying}>
                  {verifying ? "Verificando..." : "Continuar"}
                </button>

                <p className={styles.description} style={{ textAlign: "center", marginTop: "12px" }}>
                  ¿No recibiste el código?{" "}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={saving || cooldown > 0}
                    className={styles.secondaryButton}
                    style={{ minHeight: "auto", padding: "4px 10px", marginTop: 0 }}
                  >
                    {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSavePassword} noValidate>
                <label htmlFor="newPassword">Nueva contraseña</label>
                <div style={passwordFieldStyle}>
                  <input
                    id="newPassword"
                    type={showPasswords.password ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={passwordError ? styles.inputError : ""}
                    style={passwordInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((current) => ({
                        ...current,
                        password: !current.password,
                      }))
                    }
                    style={revealButtonStyle}
                  >
                    {showPasswords.password ? "Ocultar" : "Ver"}
                  </button>
                </div>

                <label htmlFor="confirmPassword">Confirmar contraseña</label>
                <div style={passwordFieldStyle}>
                  <input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={passwordError ? styles.inputError : ""}
                    style={passwordInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((current) => ({
                        ...current,
                        confirm: !current.confirm,
                      }))
                    }
                    style={revealButtonStyle}
                  >
                    {showPasswords.confirm ? "Ocultar" : "Ver"}
                  </button>
                </div>
                {passwordError ? (
                  <span className={styles.errorText}>{passwordError}</span>
                ) : null}

                <button type="submit" disabled={saving}>
                  {saving ? "Actualizando..." : "Guardar contraseña"}
                </button>
              </form>
            )}

            <Link href="/forgot-password" className={styles.forgotLink}>
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
    <Suspense fallback={<section className={styles.authShell} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
