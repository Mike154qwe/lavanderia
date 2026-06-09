"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const OCULTAR = ["/login", "/empleado-login", "/recibos", "/cierres-caja"];

const TITULOS: Record<string, string> = {
  "/gerente":                   "Panel financiero",
  "/pedidos":                   "Pedidos",
  "/pedidos/nuevo":             "Nuevo pedido",
  "/pedidos/rapido":            "Pedido rápido",
  "/inventario":                "Inventario",
  "/inventario-empleado":       "Inventario",
  "/pedidos-antiguos":          "Pedidos antiguos",
  "/movimientos":               "Movimientos",
  "/clientes":                  "Clientes",
  "/entradas-salidas-empleado": "Entradas y salidas",
  "/gastos-empleado":           "Gastos del día",
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

  if (OCULTAR.some((r) => pathname.startsWith(r))) return null;

  const titulo =
    TITULOS[pathname] ??
    Object.entries(TITULOS)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([k]) => pathname.startsWith(k))?.[1] ??
    "Lavaseco";

  const esPedidoDetalle = /^\/pedidos\/\d+/.test(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center border-b border-gray-200 bg-white/90 px-6 backdrop-blur-sm dark:border-white/[0.07] dark:bg-[#0d1117]/90">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-400 dark:text-gray-600">Lavaseco</span>
        <ChevronIcon />
        {esPedidoDetalle ? (
          <>
            <span className="font-medium text-gray-400 dark:text-gray-600">Pedidos</span>
            <ChevronIcon />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              #{pathname.split("/")[2]?.padStart(5, "0")}
            </span>
          </>
        ) : (
          <span className="font-semibold text-gray-900 dark:text-gray-100">{titulo}</span>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />

        <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 sm:flex dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
          En línea
        </div>
      </div>
    </header>
  );
}
