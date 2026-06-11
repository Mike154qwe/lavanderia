"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-red-500">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      </div>

      <h1 className="mt-5 text-2xl font-black text-gray-900 dark:text-white">
        Algo salió mal
      </h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-xs text-gray-400">
          Código: {error.digest}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 active:scale-[0.98]"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
