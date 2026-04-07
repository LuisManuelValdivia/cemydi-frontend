"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { confirmEmailVerification, resendVerificationEmail } from "@/services/auth";

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
const descriptionClassName = "text-sm leading-[1.65] text-gray-600";
const primaryLinkClassName =
  "mt-2 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[#1e6260] px-3.5 font-bold text-white no-underline";
const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#1e6260] bg-transparent px-3.5 font-bold text-[#1e6260] disabled:cursor-not-allowed disabled:opacity-60";
const footerLinkClassName =
  "inline-flex text-[13px] font-semibold text-[#1e6260] no-underline hover:underline";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const correo = searchParams.get("correo") ?? "";

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    token ? "loading" : "idle",
  );
  const [message, setMessage] = useState(
    token
      ? "Estamos verificando tu correo..."
      : "Te enviamos un enlace de verificación a tu correo.",
  );
  const [loadingResend, setLoadingResend] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const run = async () => {
      try {
        const result = await confirmEmailVerification(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(result.message);
        toast.success(result.message);
      } catch (err: unknown) {
        if (cancelled) return;
        const nextMessage =
          err instanceof Error ? err.message : "No se pudo verificar el correo.";
        setStatus("error");
        setMessage(nextMessage);
        toast.error(nextMessage);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async () => {
    if (!correo) {
      toast.error("No encontramos el correo para reenviar el enlace.");
      return;
    }

    try {
      setLoadingResend(true);
      const result = await resendVerificationEmail(correo);
      toast.success(result.message);
    } catch (err: unknown) {
      const nextMessage =
        err instanceof Error ? err.message : "No se pudo reenviar el enlace.";
      toast.error(nextMessage);
    } finally {
      setLoadingResend(false);
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
            <h2 className="mb-2 text-[2rem]">Verifica tu correo</h2>
            <span className="text-sm text-[#dcfce7]">
              Confirma tu cuenta para poder iniciar sesión.
            </span>
          </div>
        </div>

        <div className={rightClassName}>
          <div className={cardClassName}>
            <h2 className="mb-2 text-[2rem] text-[#0f3d3b]">Verificación de correo</h2>
            <p className={`${descriptionClassName} mb-0`}>{message}</p>

            {status === "loading" ? (
              <p className="mt-4 text-sm text-gray-600">Validando enlace...</p>
            ) : null}
            {status === "success" ? (
              <Link href="/login" className={primaryLinkClassName}>
                Ir a iniciar sesión
              </Link>
            ) : null}

            {!token ? (
              <div className="mt-4 grid gap-2.5">
                <p className="m-0 text-sm text-gray-600">
                  Si no encuentras el mensaje, puedes pedir otro enlace.
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loadingResend || !correo}
                  className={secondaryButtonClassName}
                >
                  {loadingResend ? "Reenviando..." : "Reenviar enlace"}
                </button>
              </div>
            ) : null}

            {status === "error" ? (
              <div className="mt-4 grid gap-2.5">
                <p className="m-0 text-sm text-gray-600">
                  El enlace ya no es válido. Puedes solicitar uno nuevo.
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loadingResend || !correo}
                  className={secondaryButtonClassName}
                >
                  {loadingResend ? "Reenviando..." : "Reenviar enlace"}
                </button>
              </div>
            ) : null}

            <Link href="/login" className={`${footerLinkClassName} mt-4`}>
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<section className={authShellClassName} />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
