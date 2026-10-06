"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

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
    <div className="page-frame">
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <span className="figure-well h-16 w-16 bg-red-50 text-red-500 dark:bg-red-500/10">
          <TriangleAlert size={32} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h1 className="page-title mt-5">Algo salió mal</h1>
        <p className="page-subtitle mx-auto max-w-sm">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[color:var(--text-4)]">
            Código: {error.digest}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button onClick={reset} className="btn-primary">
            Intentar de nuevo
          </button>
          <Link href="/" className="btn-dark">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
