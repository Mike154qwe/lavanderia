import type { Metadata } from "next";
import { empleadoLoginAction } from "./actions";

export const metadata: Metadata = { title: "Acceso empleado" };

const BUBBLES = [
  { size: 22,  left: "5%",  delay: "0s",   dur: "11s" },
  { size: 56,  left: "15%", delay: "2s",   dur: "14s" },
  { size: 18,  left: "28%", delay: "4s",   dur: "9s"  },
  { size: 80,  left: "42%", delay: "1s",   dur: "17s" },
  { size: 34,  left: "58%", delay: "3s",   dur: "12s" },
  { size: 20,  left: "70%", delay: "5s",   dur: "8s"  },
  { size: 60,  left: "82%", delay: "1.5s", dur: "15s" },
  { size: 26,  left: "93%", delay: "3.5s", dur: "10s" },
  { size: 44,  left: "50%", delay: "6s",   dur: "13s" },
];

export default function EmpleadoLoginPage() {
  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-8"
      style={{ background: "linear-gradient(160deg, #05090f 0%, #0b1220 50%, #080d1a 100%)" }}
    >
      {/* Burbujas */}
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
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(70,95,255,0.1) 0%, transparent 70%)",
        }}
      />

      {/* Contenido principal */}
      <div className="animate-fade-up relative z-10 flex flex-col items-center text-center">

        {/* Ícono circular con glow */}
        <div
          className="mb-8 flex h-32 w-32 items-center justify-center rounded-full text-6xl"
          style={{
            background: "linear-gradient(145deg, rgba(70,95,255,0.25), rgba(70,95,255,0.08))",
            border: "2px solid rgba(70,95,255,0.3)",
            boxShadow: "0 0 40px rgba(70,95,255,0.25), inset 0 0 20px rgba(70,95,255,0.08)",
          }}
        >
          🧺
        </div>

        <p
          className="mb-1 text-sm font-black uppercase tracking-[0.2em]"
          style={{ color: "rgba(70,95,255,0.8)" }}
        >
          Lavaseco
        </p>
        <h1 className="text-5xl font-black leading-none tracking-tight text-white">
          La Manuelita
        </h1>
        <p className="mt-3 text-lg font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
          Portal del empleado
        </p>
      </div>

      {/* Botón grande */}
      <div className="animate-fade-up-2 relative z-10 mt-12 w-full max-w-xs">
        <form action={empleadoLoginAction}>
          <button
            className="w-full rounded-3xl py-7 text-2xl font-black text-white transition active:scale-95"
            style={{
              background: "linear-gradient(135deg, #465fff 0%, #3641f5 100%)",
              boxShadow: "0 8px 32px rgba(70,95,255,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            ✅ Ingresar
          </button>
        </form>
        <p className="mt-5 text-center text-base font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
          Toca el botón para entrar
        </p>
      </div>

      {/* Línea decorativa inferior */}
      <div
        className="animate-fade-up-3 relative z-10 mt-20 flex items-center gap-4"
        style={{ color: "rgba(255,255,255,0.12)" }}
      >
        <div className="h-px w-16" style={{ background: "rgba(255,255,255,0.1)" }} />
        <a
          href="/login"
          className="text-sm font-semibold transition hover:text-white/30"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          Acceso gerente
        </a>
        <div className="h-px w-16" style={{ background: "rgba(255,255,255,0.1)" }} />
      </div>
    </main>
  );
}
