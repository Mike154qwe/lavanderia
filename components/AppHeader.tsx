"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { useSidebarNav } from "@/components/AppShell";

const OCULTAR = ["/login", "/empleado-login", "/recibos", "/cierres-caja"];

const TITULOS: Record<string, string> = {
  "/gerente":                   "Panel financiero",
  "/pedidos":                   "Pedidos",
  "/pedidos/nuevo":             "Nuevo pedido",
  "/pedidos/rapido":            "Pedido rápido",
  "/inventario":                "Inventario",
  "/inventario-empleado":       "Buscar / entregar",
  "/pedidos-antiguos":          "Pedidos antiguos",
  "/movimientos":               "Movimientos",
  "/clientes":                  "Clientes",
  "/clientes-empleado":         "Clientes",
  "/entradas-salidas-empleado": "Entradas y salidas",
  "/gastos-empleado":           "Gastos del día",
  "/empleado":                  "Inicio",
  "/entrega-empleado":          "Entrega y cobro",
};

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600">
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
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center border-b border-gray-200 bg-white/90 px-4 backdrop-blur-sm sm:px-6 dark:border-white/[0.07] dark:bg-[#0d1117]/90">
      <button
        type="button"
        className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 md:hidden dark:border-white/10 dark:text-gray-300"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden font-medium text-gray-400 sm:inline dark:text-gray-600">Lavaseco</span>
        <span className="hidden sm:inline"><ChevronIcon /></span>
        {esPedidoDetalle ? (
          <>
            <span className="font-medium text-gray-400 dark:text-gray-600">Pedidos</span>
            <ChevronIcon />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              #{pathname.split("/")[2]?.padStart(5, "0")}
            </span>
          </>
        ) : (
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">{titulo}</span>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
