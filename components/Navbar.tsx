"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const RUTAS_SIN_NAVBAR = [
  "/login",
  "/empleado-login",
  "/recibos",
  "/cierres-caja",
];

const RUTAS_EMPLEADO = [
  "/pedidos/rapido",
  "/inventario-empleado",
  "/entradas-salidas-empleado",
  "/gastos-empleado",
  "/empleado",
];

const linksGerente = [
  { href: "/empleado", label: "📋 Operación diaria" },
  { href: "/inventario", label: "📦 Inventario" },
  { href: "/pedidos-antiguos", label: "🕐 Pedidos antiguos" },
  { href: "/gerente", label: "💰 Finanzas" },
  { href: "/movimientos", label: "📊 Movimientos" },
  { href: "/pedidos/nuevo", label: "➕ Nuevo pedido" },
];

const linksEmpleado = [
  { href: "/pedidos/rapido", label: "📝 Nuevo pedido" },
  { href: "/inventario-empleado", label: "📦 Inventario" },
  { href: "/entradas-salidas-empleado", label: "📥 Entradas y salidas" },
  { href: "/gastos-empleado", label: "💵 Gastos del día" },
];

export default function Navbar() {
  const pathname = usePathname();

  const ocultar = RUTAS_SIN_NAVBAR.some((ruta) => pathname.startsWith(ruta));
  if (ocultar) return null;

  const esEmpleado = RUTAS_EMPLEADO.some((ruta) => pathname.startsWith(ruta));

  const links = esEmpleado ? linksEmpleado : linksGerente;
  const logoutHref = esEmpleado ? "/empleado-logout" : "/logout";
  const rolLabel = esEmpleado ? "👩‍💼 Empleado" : "👨‍💼 Gerente";

  return (
    <nav className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {/* Marca */}
        <Link
          href={esEmpleado ? "/pedidos/rapido" : "/gerente"}
          className="shrink-0 text-base font-black tracking-tight text-white"
        >
          🧺 La Manuelita
        </Link>

        {/* Links de navegación */}
        <div className="flex flex-1 items-center justify-center gap-1 overflow-x-auto">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Rol + cerrar sesión */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 sm:block">
            {rolLabel}
          </span>
          <a
            href={logoutHref}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700"
          >
            🚪 Salir
          </a>
        </div>
      </div>
    </nav>
  );
}
