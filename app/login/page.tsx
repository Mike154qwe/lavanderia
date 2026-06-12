import type { Metadata } from "next";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "Acceso gerente" };

const BUBBLES = [
  { size: 28,  left: "8%",  delay: "0s",   dur: "9s"  },
  { size: 48,  left: "18%", delay: "1.5s", dur: "13s" },
  { size: 20,  left: "32%", delay: "3s",   dur: "8s"  },
  { size: 64,  left: "48%", delay: "0.8s", dur: "15s" },
  { size: 36,  left: "62%", delay: "2.2s", dur: "11s" },
  { size: 22,  left: "75%", delay: "4s",   dur: "9s"  },
  { size: 52,  left: "88%", delay: "1s",   dur: "14s" },
  { size: 18,  left: "55%", delay: "5s",   dur: "7s"  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error  = params.error === "1";

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: "linear-gradient(135deg, #060b14 0%, #0d1525 60%, #060b14 100%)" }}
    >
      {/* Burbujas de jabón flotantes */}
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="soap-bubble"
          style={{
            width:  b.size,
            height: b.size,
            left:   b.left,
            bottom: "-10%",
            ["--delay" as any]: b.delay,
            ["--dur"   as any]: b.dur,
          }}
        />
      ))}

      {/* Luz ambiental de fondo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 50%, rgba(70,95,255,0.08) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 80% 30%, rgba(191,13,89,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Tarjeta principal */}
      <div className="relative z-10 flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl"
           style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)" }}>

        {/* ── Panel izquierdo ── */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-3/5"
          style={{ background: "linear-gradient(145deg, #0d1830 0%, #111e38 100%)" }}
        >
          {/* Línea decorativa superior */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

          {/* Círculo decorativo fondo */}
          <div
            className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #465fff 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #bf0d59 0%, transparent 70%)" }}
          />

          {/* Logo */}
          <div className="animate-fade-up relative">
            <div
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{
                background: "linear-gradient(145deg, rgba(70,95,255,0.3), rgba(70,95,255,0.1))",
                border: "1px solid rgba(70,95,255,0.3)",
                boxShadow: "0 0 24px rgba(70,95,255,0.2)",
              }}
            >
              🧺
            </div>
            <h1 className="text-5xl font-black leading-none tracking-tight text-white">
              La<br />Manuelita
            </h1>
            <p className="mt-3 text-base font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
              Lavaseco · Sistema de gestión
            </p>
          </div>

          {/* Features */}
          <div className="animate-fade-up-2 space-y-3">
            {[
              { icon: "📊", label: "Panel financiero en tiempo real" },
              { icon: "🧺", label: "Inventario y pedidos integrados"  },
              { icon: "💳", label: "Control de caja y movimientos"    },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>

          {/* Línea decorativa inferior */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* ── Panel derecho — Formulario ── */}
        <div className="flex flex-1 flex-col justify-center bg-white px-10 py-14 lg:px-14">
          <div className="animate-fade-up-3 mx-auto w-full max-w-sm">

            {/* Logo móvil */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-xl">🧺</div>
              <p className="font-black text-gray-900">La Manuelita</p>
            </div>

            <p className="mb-1 text-xs font-black uppercase tracking-widest text-brand-500">
              Acceso restringido
            </p>
            <h2 className="text-3xl font-black leading-tight text-gray-900">
              Panel de gerente
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Ingresa tus credenciales para continuar.
            </p>

            {error && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                <span className="text-lg">⚠️</span>
                <p className="text-sm font-bold text-red-600">Usuario o contraseña incorrectos.</p>
              </div>
            )}

            <form action={loginAction} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Usuario
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">👤</span>
                  <input
                    name="usuario"
                    required
                    autoComplete="username"
                    placeholder="Nombre de usuario"
                    className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-base font-semibold text-gray-900 transition placeholder:font-normal placeholder:text-gray-300 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-gray-400">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">🔑</span>
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-base font-semibold text-gray-900 transition placeholder:font-normal placeholder:text-gray-300 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
              </div>

              <button
                className="mt-2 w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, #465fff 0%, #3641f5 100%)",
                  boxShadow: "0 4px 20px rgba(70,95,255,0.35)",
                }}
              >
                Entrar al sistema →
              </button>
            </form>

            <div className="mt-8 border-t border-gray-100 pt-6 text-center">
              <a
                href="/empleado-login"
                className="text-sm font-semibold text-gray-400 transition hover:text-brand-500"
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
