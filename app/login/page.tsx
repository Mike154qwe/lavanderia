import type { Metadata } from "next";
import { AlertTriangle, LayoutDashboard, Lock, Package, User, Wallet } from "lucide-react";
import LaundryBackdrop from "@/components/login/LaundryBackdrop";
import BrandMark from "@/components/BrandMark";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "Acceso gerente" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error === "1";

  return (
    <main className="login-shell">
      <LaundryBackdrop />

      <div
        className="relative z-10 flex w-full max-w-5xl overflow-hidden rounded-[var(--radius-card)]"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        <div
          className="relative hidden flex-col justify-between overflow-hidden px-12 py-12 lg:flex lg:w-[55%]"
          style={{ background: "linear-gradient(160deg, #0c1730 0%, #101c36 100%)" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

          <div className="animate-fade-up relative">
            <BrandMark size={56} />
            <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight text-white">
              La
              <br />
              Manuelita
            </h1>
            <p className="mt-3 text-base font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
              Lavaseco · Sistema de gestión
            </p>
          </div>

          <ul className="animate-fade-up-2 mt-10 space-y-2.5">
            {[
              { icon: LayoutDashboard, label: "Panel financiero del día" },
              { icon: Package, label: "Inventario y pedidos integrados" },
              { icon: Wallet, label: "Control de caja y movimientos" },
            ].map((f) => (
              <li
                key={f.label}
                className="flex items-center gap-3 rounded-[var(--radius-well)] px-3.5 py-3"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                <span className="figure-well figure-well--brand h-9 w-9">
                  <f.icon size={16} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.82)" }}>
                  {f.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="flex flex-1 flex-col justify-center bg-[color:var(--surface)] px-8 py-12 sm:px-12 lg:px-14">
          <div className="animate-fade-up-3 mx-auto w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandMark size={40} />
              <p className="font-bold text-[color:var(--text-1)]">La Manuelita</p>
            </div>

            <p className="page-kicker text-brand-500">Acceso restringido</p>
            <h2 className="page-title !text-[1.75rem]">Panel de gerente</h2>
            <p className="page-subtitle">Ingresa tus credenciales para continuar.</p>

            {error && (
              <div className="mt-5 flex items-center gap-3 rounded-[var(--radius-well)] bg-red-50 px-4 py-3 ring-1 ring-red-200">
                <AlertTriangle size={18} strokeWidth={2} className="shrink-0 text-red-600" aria-hidden="true" />
                <p className="text-sm font-bold text-red-700">Usuario o contraseña incorrectos.</p>
              </div>
            )}

            <form action={loginAction} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[color:var(--text-2)]">
                  Usuario
                </label>
                <div className="relative">
                  <User
                    size={18}
                    strokeWidth={1.75}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-3)]"
                    aria-hidden="true"
                  />
                  <input
                    name="usuario"
                    required
                    autoComplete="username"
                    placeholder="Nombre de usuario"
                    className="input-modern w-full py-3.5 pl-11 pr-4 text-base font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[color:var(--text-2)]">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    strokeWidth={1.75}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-3)]"
                    aria-hidden="true"
                  />
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    className="input-modern w-full py-3.5 pl-11 pr-4 text-base font-semibold"
                  />
                </div>
              </div>

              <button
                className="btn-primary mt-2 w-full py-4 text-base"
              >
                Entrar al sistema →
              </button>
            </form>

            <div className="mt-8 border-t border-[color:var(--border-1)] pt-6 text-center">
              <a
                href="/empleado-login"
                className="text-sm font-semibold text-[color:var(--text-2)] transition hover:text-brand-500"
              >
                ¿Eres empleado? Ingresa aquí →
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
