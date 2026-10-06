import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page-frame">
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <span className="figure-well figure-well--brand h-16 w-16">
          <FileQuestion size={32} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h1 className="page-title mt-5">Página no encontrada</h1>
        <p className="page-subtitle mx-auto max-w-sm">
          La página que buscas no existe o fue movida.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
