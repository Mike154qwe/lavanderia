import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-brand-500">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
          <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
          <path d="M10 12h.01M14 12h.01M10 16h4" />
        </svg>
      </div>

      <h1 className="mt-5 text-2xl font-black text-gray-900 dark:text-white">
        Página no encontrada
      </h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        La página que buscas no existe o fue movida.
      </p>

      <Link
        href="/"
        className="mt-6 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 active:scale-[0.98]"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
