"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  BarChart3,
  ClipboardList,
  Clock,
  House,
  Layers,
  LayoutDashboard,
  LogOut,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useSidebarNav } from "@/components/AppShell";
import BrandMark from "@/components/BrandMark";

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

const icon = { size: 18, strokeWidth: 1.75 } as const;

const GERENTE_NAV: NavGroup[] = [
  {
    grupo: "Operación",
    items: [
      { label: "Panel", href: "/gerente", icon: <LayoutDashboard {...icon} /> },
      { label: "Pedidos", href: "/pedidos", icon: <ClipboardList {...icon} /> },
      { label: "Inventario", href: "/inventario", icon: <Layers {...icon} /> },
      { label: "Clientes", href: "/clientes", icon: <Users {...icon} /> },
      { label: "Pedidos antiguos", href: "/pedidos-antiguos", icon: <Clock {...icon} /> },
    ],
  },
  {
    grupo: "Finanzas",
    items: [
      { label: "Movimientos", href: "/movimientos", icon: <BarChart3 {...icon} /> },
    ],
  },
];

const EMPLEADO_NAV: NavGroup[] = [
  {
    grupo: "Mi trabajo",
    items: [
      { label: "Mostrador", href: "/empleado", icon: <House {...icon} /> },
      {
        label: "Llegó a dejar",
        href: "/pedidos/rapido",
        aliases: ["/clientes-empleado"],
        icon: <Zap {...icon} />,
      },
      {
        label: "Llegó a recoger",
        href: "/inventario-empleado",
        aliases: ["/entrega-empleado", "/entradas-salidas-empleado"],
        icon: <Layers {...icon} />,
      },
      { label: "Gastos del día", href: "/gastos-empleado", icon: <Wallet {...icon} /> },
    ],
  },
];

const GRUPO = "rgba(255,255,255,0.45)";
const INACTIVO_ICONO = "rgba(255,255,255,0.7)";

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
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex h-screen w-[260px] shrink-0 flex-col overflow-y-auto transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="app-sidebar-rule flex items-center gap-3 border-b px-5 py-5">
          <BrandMark size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">
              La Manuelita
            </p>
            <p className="text-xs" style={{ color: GRUPO }}>Lavaseco</p>
          </div>
        </div>

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
                      className={`group relative flex items-center gap-3 rounded-[var(--radius-well)] px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                        active ? "app-nav-active" : "app-nav-link"
                      }`}
                    >
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

        <div className="app-sidebar-rule border-t px-3 py-4">
          <a
            href={logoutHref}
            className="app-nav-link group flex items-center gap-3 rounded-[var(--radius-well)] px-3 py-2.5 text-sm font-semibold transition-all"
          >
            <span
              className="transition-colors group-hover:text-white"
              style={{ color: INACTIVO_ICONO }}
            >
              <LogOut {...icon} />
            </span>
            <span className="transition-colors group-hover:text-white">Cerrar sesión</span>
          </a>
        </div>
      </aside>
    </>
  );
}
