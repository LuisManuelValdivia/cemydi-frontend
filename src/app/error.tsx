"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const shellClassName =
  "flex min-h-[calc(100vh-160px)] items-center justify-center bg-[#f8fbfb] px-5 py-12";
const wrapClassName = "w-full max-w-[720px]";
const eyebrowClassName =
  "mb-2.5 text-[0.82rem] font-bold uppercase tracking-[0.12em] text-[#1e6260]";
const titleClassName =
  "m-0 text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold text-[#0f172a]";
const descriptionClassName =
  "mt-[18px] max-w-[58ch] text-base leading-[1.7] text-[#475569]";
const actionsClassName = "mt-7 flex flex-wrap gap-3 max-[720px]:flex-col";
const primaryButtonClassName =
  "inline-flex min-h-[46px] items-center justify-center rounded-full border-0 bg-[#0f3d3b] px-[18px] font-semibold text-white";
const secondaryLinkClassName =
  "inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#cfe0e0] px-[18px] font-semibold text-[#0f3d3b] no-underline";
const detailClassName = "mt-6 text-[0.92rem] text-[#64748b]";
const stackClassName =
  "mt-2.5 rounded-[14px] border border-[#e2e8f0] bg-white px-[14px] py-3 text-[0.9rem] break-words whitespace-pre-wrap text-[#334155]";

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className={shellClassName}>
      <div className={wrapClassName}>
        <p className={eyebrowClassName}>Error</p>
        <h1 className={titleClassName}>{"No pudimos cargar esta secci\u00f3n."}</h1>
        <p className={descriptionClassName}>
          {"Ocurri\u00f3 un problema inesperado. Puedes intentarlo de nuevo o volver al inicio."}
        </p>

        <div className={actionsClassName}>
          <button type="button" onClick={reset} className={primaryButtonClassName}>
            Intentar de nuevo
          </button>
          <Link href="/" className={secondaryLinkClassName}>
            Volver al inicio
          </Link>
        </div>

        {error.message ? <p className={detailClassName}>{"Mensaje t\u00e9cnico registrado:"}</p> : null}
        {error.message ? <pre className={stackClassName}>{error.message}</pre> : null}
      </div>
    </section>
  );
}
