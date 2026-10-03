import type { Metadata } from "next";
import { LogIn } from "lucide-react";
import LaundryBackdrop from "@/components/login/LaundryBackdrop";
import BrandMark from "@/components/BrandMark";
import { empleadoLoginAction } from "./actions";

export const metadata: Metadata = { title: "Acceso empleado" };

export default function EmpleadoLoginPage() {
  return (
    <main className="login-shell">
      <LaundryBackdrop />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="animate-fade-up">
          <BrandMark size={112} />
          <p
            className="mb-1 mt-7 text-sm font-bold uppercase tracking-[0.22em]"
            style={{ color: "#93a8ff" }}
          >
            Lavaseco
          </p>
          <h1 className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
            La Manuelita
          </h1>
          <p className="mt-3 text-base font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>
            Portal del empleado
          </p>
        </div>

        <form action={empleadoLoginAction} className="animate-fade-up-2 mt-10 w-full">
          <button
            className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[var(--radius-card)] py-5 text-xl font-bold text-white transition active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #465fff 0%, #3641f5 100%)",
              boxShadow: "0 8px 28px rgba(70,95,255,0.4), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <LogIn size={22} strokeWidth={2.25} aria-hidden="true" />
            Ingresar
          </button>
        </form>
        <p
          className="animate-fade-up-2 mt-4 text-center text-sm font-semibold"
          style={{ color: "rgba(255,255,255,0.58)" }}
        >
          Toca el botón para entrar
        </p>

        <div
          className="animate-fade-up-3 mt-16 flex items-center gap-4"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <div className="h-px w-14" style={{ background: "rgba(255,255,255,0.22)" }} />
          <a
            href="/login"
            className="text-sm font-semibold transition hover:text-white"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Acceso gerente
          </a>
          <div className="h-px w-14" style={{ background: "rgba(255,255,255,0.22)" }} />
        </div>
      </div>
    </main>
  );
}
