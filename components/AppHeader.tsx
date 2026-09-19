"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { useSidebarNav } from "@/components/AppShell";

const OCULTAR = ["/login", "/empleado-login", "/recibos", "/cierres-caja"];

const TITULOS: Record<string, string> = {
  "/gerente":                   "Panel financiero",
  "/gerente/remoto":            "Panel remoto",
  "/pedidos":                   "Pedidos",
  "/pedidos/nuevo":             "Nuevo pedido",
  "/pedidos/rapido":            "Pedido rápido",
  "/inventario":                "Inventario",
  "/inventario-empleado":       "Llegó a recoger",
  "/pedidos-antiguos":          "Pedidos antiguos",
  "/movimientos":               "Movimientos",
  "/clientes":                  "Clientes",
  "/clientes-empleado":         "Clientes",
  "/entradas-salidas-empleado": "Lo de hoy",
  "/gastos-empleado":           "Gastos del día",
  "/empleado":                  "Mostrador",
  "/entrega-empleado":          "Entrega y cobro",
};

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" style={{ color: "var(--text-4)" }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const { setOpen } = useSidebarNav();

  if (OCULTAR.some((r) => pathname.startsWith(r))) return null;

  const titulo =
    TITULOS[pathname] ??
    Object.entries(TITULOS)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([k]) => pathname.startsWith(k))?.[1] ??
    "Lavaseco";

  const esPedidoDetalle = /^\/pedidos\/\d+/.test(pathname);

  return (
    <header className="app-header sticky top-0 z-20 flex h-[60px] shrink-0 items-center px-4 sm:px-6">
      <button
        type="button"
        className="app-header-menu mr-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-well)] lg:hidden"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden font-medium sm:inline" style={{ color: "var(--text-4)" }}>Lavaseco</span>
        <span className="hidden sm:inline"><ChevronIcon /></span>
        {esPedidoDetalle ? (
          <>
            <span className="font-medium" style={{ color: "var(--text-4)" }}>Pedidos</span>
            <ChevronIcon />
            <span className="truncate font-semibold" style={{ color: "var(--text-1)" }}>
              #{pathname.split("/")[2]?.padStart(5, "0")}
            </span>
          </>
        ) : (
          <span className="truncate font-semibold" style={{ color: "var(--text-1)" }}>{titulo}</span>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
