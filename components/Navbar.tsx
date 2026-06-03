"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const gerenteLinks = [
  {
    href: "/empleado",
    label: "Operación diaria",
  },

  {
    href: "/inventario",
    label: "Inventario",
  },

  {
    href: "/pedidos-antiguos",
    label: "Pedidos antiguos",
  },

  {
    href: "/gerente",
    label: "Finanzas",
  },

  {
    href: "/movimientos",
    label: "Movimientos",
  },

  {
    href: "/pedidos/nuevo",
    label: "Nuevo pedido",
  },
];

const empleadoLinks = [
  {
    href: "/pedidos/rapido",
    label: "📝 Nuevo pedido",
  },

  {
    href: "/inventario-empleado",
    label: "📦 Inventario",
  },

  {
    href: "/entradas-salidas-empleado",
    label: "📥📤 Entradas y salidas",
  },

  {
    href: "/gastos-empleado",
    label: "💰 Gastos del día",
  },
];

export default function Navbar() {
  const pathname = usePathname();

  const esEmpleado =
    pathname.startsWith("/pedidos/rapido") ||
    pathname.startsWith("/inventario-empleado") ||
    pathname.startsWith("/entradas-salidas-empleado") ||
    pathname.startsWith("/gastos-empleado");

  const links = esEmpleado
    ? empleadoLinks
    : gerenteLinks;

  const logoutUrl = esEmpleado
    ? "/empleado-logout"
    : "/logout";

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-gradient-to-b from-indigo-950 via-violet-900 to-purple-700 text-white">
      <div className="border-b border-white/10 p-8">
        <h1 className="text-3xl font-black tracking-tight">
          Lavaseco
        </h1>

        <p className="mt-2 text-sm text-violet-200">
          La Manuelita
        </p>

        <div className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">
          {esEmpleado
            ? "👩‍💼 Panel empleado"
            : "👨‍💼 Panel gerencia"}
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-5">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            pathname.startsWith(link.href + "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center rounded-2xl px-5 py-4 text-sm font-bold transition ${
                active
                  ? "bg-white text-violet-700 shadow-2xl"
                  : "text-violet-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-5">
        <div className="rounded-3xl bg-white/10 p-5 backdrop-blur">
          <p className="text-sm font-bold">
            {esEmpleado
              ? "Acceso empleado"
              : "Panel administrativo"}
          </p>

          <p className="mt-1 text-xs text-violet-200">
            {esEmpleado
              ? "Pedidos, inventario, gastos y entregas"
              : "Administración completa de la lavandería"}
          </p>

          <a
            href={logoutUrl}
            className="mt-5 flex items-center justify-center rounded-2xl bg-red-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600"
          >
            🚪 Cerrar sesión
          </a>
        </div>
      </div>
    </aside>
  );
}