"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const OCULTAR = ["/login", "/empleado-login", "/recibos", "/cierres-caja"];

const RUTAS_EMPLEADO = [
  "/pedidos/rapido",
  "/inventario-empleado",
  "/entradas-salidas-empleado",
  "/gastos-empleado",
  "/empleado",
  "/clientes-empleado",
];

type NavItem = { label: string; href: string; icon: React.ReactNode };
type NavGroup = { grupo: string; items: NavItem[] };

function Icon({ d }: { d: string | string[] }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const GERENTE_NAV: NavGroup[] = [
  {
    grupo: "Operación",
    items: [
      {
        label: "Panel",
        href: "/gerente",
        icon: <Icon d={["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"]} />,
      },
      {
        label: "Pedidos",
        href: "/pedidos",
        icon: <Icon d={["M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2", "M9 12h6M9 16h4"]} />,
      },
      {
        label: "Nuevo pedido",
        href: "/pedidos/nuevo",
        icon: <Icon d="M12 5v14M5 12h14" />,
      },
      {
        label: "Inventario",
        href: "/inventario",
        icon: <Icon d={["M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z", "M16 3H8L6 7h12l-2-4z"]} />,
      },
      {
        label: "Pedidos antiguos",
        href: "/pedidos-antiguos",
        icon: <Icon d={["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 6v6l4 2"]} />,
      },
    ],
  },
  {
    grupo: "Finanzas",
    items: [
      {
        label: "Movimientos",
        href: "/movimientos",
        icon: <Icon d={["M18 20V10", "M12 20V4", "M6 20v-6"]} />,
      },
      {
        label: "Clientes",
        href: "/clientes",
        icon: <Icon d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"]} />,
      },
    ],
  },
];

const EMPLEADO_NAV: NavGroup[] = [
  {
    grupo: "Mi trabajo",
    items: [
      {
        label: "Inventario",
        href: "/inventario-empleado",
        icon: <Icon d={["M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z", "M16 3H8L6 7h12l-2-4z"]} />,
      },
      {
        label: "Clientes",
        href: "/clientes-empleado",
        icon: <Icon d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />,
      },
      {
        label: "Pedido rápido",
        href: "/pedidos/rapido",
        icon: <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
      },
      {
        label: "Entradas / Salidas",
        href: "/entradas-salidas-empleado",
        icon: <Icon d={["M17 1l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"]} />,
      },
      {
        label: "Gastos del día",
        href: "/gastos-empleado",
        icon: <Icon d={["M12 1v22", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"]} />,
      },
    ],
  },
];

function isActive(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  if (href === "/") return false;
  if (href === "/pedidos") return /^\/pedidos\/\d+/.test(pathname);
  return pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();

  if (OCULTAR.some((r) => pathname.startsWith(r))) return null;

  const esEmpleado = RUTAS_EMPLEADO.some((r) => pathname.startsWith(r));
  const nav = esEmpleado ? EMPLEADO_NAV : GERENTE_NAV;
  const logoutHref = esEmpleado ? "/empleado-logout" : "/logout";

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col overflow-y-auto bg-[#0f1117]">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-lg">
          🧺
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white leading-tight">
            La Manuelita
          </p>
          <p className="text-xs text-slate-400">Lavaseco</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 px-3 py-5">
        {nav.map((grupo) => (
          <div key={grupo.grupo}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              {grupo.grupo}
            </p>
            <div className="space-y-0.5">
              {grupo.items.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-brand-500 text-white shadow-sm"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                    }`}
                  >
                    <span className={active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/[0.07] px-3 py-4">
        <a
          href={logoutHref}
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-white/[0.06] hover:text-slate-100"
        >
          <span className="text-slate-500 group-hover:text-slate-300">
            <Icon d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"]} />
          </span>
          Cerrar sesión
        </a>
      </div>
    </aside>
  );
}
