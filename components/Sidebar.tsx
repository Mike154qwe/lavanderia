"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSidebarNav } from "@/components/AppShell";

const OCULTAR = ["/login", "/empleado-login", "/recibos", "/cierres-caja"];

const RUTAS_EMPLEADO = [
  "/pedidos/rapido",
  "/inventario-empleado",
  "/entradas-salidas-empleado",
  "/gastos-empleado",
  "/empleado",
  "/clientes-empleado",
  "/entrega-empleado",
];

type NavItem = { label: string; href: string; icon: React.ReactNode; aliases?: string[] };
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
        label: "Inventario",
        href: "/inventario",
        icon: <Icon d={["M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z", "M16 3H8L6 7h12l-2-4z"]} />,
      },
      {
        label: "Clientes",
        href: "/clientes",
        icon: <Icon d={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"]} />,
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
    ],
  },
];

const EMPLEADO_NAV: NavGroup[] = [
  {
    grupo: "Mi trabajo",
    items: [
      {
        label: "Llegó a dejar",
        href: "/pedidos/rapido",
        aliases: ["/clientes-empleado"],
        icon: <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
      },
      {
        label: "Llegó a recoger",
        href: "/inventario-empleado",
        aliases: ["/entrega-empleado", "/entradas-salidas-empleado"],
        icon: <Icon d={["M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z", "M16 3H8L6 7h12l-2-4z"]} />,
      },
      {
        label: "Gastos del día",
        href: "/gastos-empleado",
        icon: <Icon d={["M12 1v22", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"]} />,
      },
    ],
  },
];

const INACTIVO = "rgba(255,255,255,0.72)";
const INACTIVO_ICONO = "rgba(255,255,255,0.7)";
const GRUPO = "rgba(255,255,255,0.45)";

function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  if (item.href === "/") return false;
  if (item.href === "/pedidos") return /^\/pedidos\/\d+/.test(pathname);
  if (pathname.startsWith(item.href + "/")) return true;
  return (item.aliases ?? []).some(
    (alias) => pathname === alias || pathname.startsWith(alias + "/")
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebarNav();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  if (OCULTAR.some((r) => pathname.startsWith(r))) return null;

  const esEmpleado = RUTAS_EMPLEADO.some((r) => pathname.startsWith(r));
  const nav = esEmpleado ? EMPLEADO_NAV : GERENTE_NAV;
  const logoutHref = esEmpleado ? "/empleado-logout" : "/logout";

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/45 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[260px] shrink-0 flex-col overflow-y-auto transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "linear-gradient(180deg, #0d1119 0%, #0a0e16 100%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{
              background: "linear-gradient(145deg, rgba(70,95,255,0.4), rgba(70,95,255,0.15))",
              border: "1px solid rgba(70,95,255,0.3)",
              boxShadow: "0 0 12px rgba(70,95,255,0.2)",
            }}
          >
            🧺
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">
              La Manuelita
            </p>
            <p className="text-xs" style={{ color: GRUPO }}>Lavaseco</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 px-3 py-5">
          {nav.map((grupo) => (
            <div key={grupo.grupo}>
              <p
                className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color: GRUPO }}
              >
                {grupo.grupo}
              </p>
              <div className="space-y-0.5">
                {grupo.items.map((item) => {
                  const active = isActive(item, pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150"
                      style={
                        active
                          ? {
                              background: "linear-gradient(135deg, rgba(70,95,255,0.25), rgba(70,95,255,0.12))",
                              color: "#ffffff",
                              boxShadow: "0 0 0 1px rgba(70,95,255,0.25), 0 2px 8px rgba(70,95,255,0.12)",
                            }
                          : { color: INACTIVO }
                      }
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
                          style={{ background: "#465fff", boxShadow: "0 0 6px #465fff" }}
                        />
                      )}
                      <span
                        style={active ? { color: "#93a8ff" } : { color: INACTIVO_ICONO }}
                        className="transition-colors group-hover:!text-white"
                      >
                        {item.icon}
                      </span>
                      <span className="transition-colors group-hover:text-white">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div
          className="px-3 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <a
            href={logoutHref}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all"
            style={{ color: INACTIVO }}
          >
            <span
              className="transition-colors group-hover:text-white"
              style={{ color: INACTIVO_ICONO }}
            >
              <Icon d={["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"]} />
            </span>
            <span className="transition-colors group-hover:text-white">Cerrar sesión</span>
          </a>
        </div>
      </aside>
    </>
  );
}
