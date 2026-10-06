import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { EmptyState } from "@/components/EmptyState";
import FieldIcon from "@/components/FieldIcon";
import { fechaCorta } from "@/lib/format";
import { sanearNombre, sanearTelefono, sanearDireccion } from "@/lib/validacion-cliente";
import { ChevronDown, MapPin, Phone, Plus, Search, User, UserPlus, Users } from "lucide-react";

export const metadata: Metadata = { title: "Clientes" };

async function crearCliente(formData: FormData) {
  "use server";
  const nombre    = sanearNombre(String(formData.get("nombre") || ""));
  const telefono  = sanearTelefono(String(formData.get("telefono") || ""));
  const direccion = sanearDireccion(String(formData.get("direccion") || ""));
  if (!nombre) return;
  try {
    await prisma.cliente.create({ data: { nombre, telefono, direccion } });
  } catch {
    /* telefono duplicado — ignorar silenciosamente */
  }
  revalidatePath("/clientes");
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q      = params.q?.trim() || "";

  const where: any = {};
  if (q) {
    where.OR = [
      { nombre:   { contains: q } },
      { telefono: { contains: q } },
    ];
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { _count: { select: { pedidos: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cliente.count(),
  ]);

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const nuevosMes = await prisma.cliente.count({
    where: { createdAt: { gte: inicioMes } },
  });

  return (
    <div className="page-frame page-frame--wide">

      {/* ── Cabecera ─────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="page-kicker text-brand-500">
              Gerente
            </p>
            <h1 className="page-title">
              Clientes
            </h1>
            <p className="page-subtitle">
              {total} registrados · {nuevosMes} nuevos este mes
            </p>
          </div>
        </div>

        {/* Búsqueda */}
        <form className="mt-5 flex gap-3">
          <FieldIcon icon={<Search size={16} strokeWidth={1.75} />} className="min-w-0 flex-1">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o teléfono…"
              className="input-modern w-full"
            />
          </FieldIcon>
          <button className="btn-primary whitespace-nowrap">Buscar</button>
          {q && (
            <Link href="/clientes" className="btn-dark whitespace-nowrap text-center">
              Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total clientes"
          value={total}
          color="blue"
          icon={<Users size={18} strokeWidth={1.75} />}
        />
        <KpiCard
          label="Nuevos este mes"
          value={nuevosMes}
          color="green"
          icon={<UserPlus size={18} strokeWidth={1.75} />}
        />
        <KpiCard
          label="En búsqueda"
          value={clientes.length}
          color="purple"
          icon={<Search size={18} strokeWidth={1.75} />}
        />
      </div>

      {/* ── Formulario nuevo cliente ──────────────────────── */}
      <details className="group card overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="font-bold text-[color:var(--text-1)]">Registrar nuevo cliente</span>
          </div>
          <ChevronDown size={16} strokeWidth={2} className="text-[color:var(--text-3)] transition duration-200 group-open:rotate-180" aria-hidden="true" />
        </summary>

        <form action={crearCliente} className="grid gap-4 border-t border-[color:var(--border-1)] px-6 py-5 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-500">
              Nombre <span className="text-red-400">*</span>
            </label>
            <FieldIcon icon={<User size={16} strokeWidth={1.75} />}>
              <input name="nombre" placeholder="Ej. María García" required className="input-modern w-full" />
            </FieldIcon>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-500">
              Teléfono
            </label>
            <FieldIcon icon={<Phone size={16} strokeWidth={1.75} />}>
              <input name="telefono" placeholder="Ej. 3001234567" className="input-modern w-full" />
            </FieldIcon>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-500">
              Dirección
            </label>
            <FieldIcon icon={<MapPin size={16} strokeWidth={1.75} />}>
              <input name="direccion" placeholder="Ej. Calle 5 # 10-20" className="input-modern w-full" />
            </FieldIcon>
          </div>
          <div className="sm:col-span-3">
            <button className="btn-primary">
              Guardar cliente
            </button>
          </div>
        </form>
      </details>

      {/* ── Tabla ────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {clientes.length === 0 ? (
          <EmptyState
            icon={<Users size={22} strokeWidth={1.75} />}
            title={q ? `Sin resultados para "${q}"` : "No hay clientes registrados"}
            description={q ? "Prueba con otro nombre o teléfono." : "Los clientes que agregues aparecerán aquí."}
            action={q ? { label: "Ver todos", href: "/clientes", secondary: true } : undefined}
          />
        ) : (
          <>
            <div className="divide-y divide-[color:var(--border-1)] md:hidden">
              {clientes.map((cliente: any) => {
                const inicial = cliente.nombre.charAt(0).toUpperCase();
                const avatarColors = [
                  "bg-blue-100 text-blue-700",
                  "bg-green-100 text-green-700",
                  "bg-purple-100 text-purple-700",
                  "bg-orange-100 text-orange-700",
                  "bg-pink-100 text-pink-700",
                  "bg-brand-100 text-brand-700",
                ];
                return (
                  <div key={cliente.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarColors[cliente.id % 6]}`}>
                        {inicial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[color:var(--text-1)]">{cliente.nombre}</p>
                        <p className="text-xs text-[color:var(--text-3)]">{cliente.telefono || "Sin teléfono"}</p>
                        <p className="mt-1 text-xs font-semibold text-[color:var(--text-3)]">
                          {cliente._count.pedidos} pedido{cliente._count.pedidos !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/pedidos/nuevo?clienteId=${cliente.id}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600"
                    >
                      <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                      Pedido
                    </Link>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[color:var(--border-1)]">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                    Cliente
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                    Teléfono
                  </th>
                  <th className="hidden px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)] sm:table-cell">
                    Dirección
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                    Pedidos
                  </th>
                  <th className="hidden px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)] md:table-cell">
                    Desde
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)]">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {clientes.map((cliente: any) => {
                  const inicial = cliente.nombre.charAt(0).toUpperCase();
                  const colorIndex = cliente.id % 6;
                  const avatarColors = [
                    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
                    "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
                    "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
                    "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
                    "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400",
                    "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400",
                  ];

                  return (
                    <tr key={cliente.id} className="group transition hover:bg-[color:var(--surface-2)]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarColors[colorIndex]}`}>
                            {inicial}
                          </div>
                          <div>
                            <p className="font-bold text-[color:var(--text-1)]">{cliente.nombre}</p>
                            <p className="text-xs text-[color:var(--text-3)]">ID #{cliente.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {cliente.telefono ? (
                          <a
                            href={`tel:${cliente.telefono}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--surface-2)] px-3 py-1.5 text-sm font-semibold text-[color:var(--text-2)] transition hover:bg-brand-50 hover:text-brand-600"
                          >
                            <Phone size={14} strokeWidth={2} aria-hidden="true" />
                            {cliente.telefono}
                          </a>
                        ) : (
                          <span className="text-sm text-[color:var(--text-3)]">—</span>
                        )}
                      </td>

                      <td className="hidden px-5 py-4 sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-2)]">
                          {cliente.direccion ? (
                            <>
                              <MapPin size={13} strokeWidth={2} className="shrink-0 text-[color:var(--text-3)]" aria-hidden="true" />
                              {cliente.direccion}
                            </>
                          ) : (
                            <span className="text-[color:var(--text-3)]">—</span>
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          cliente._count.pedidos > 0
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                            : "bg-gray-100 text-gray-400 dark:bg-white/5"
                        }`}>
                          {cliente._count.pedidos}
                        </span>
                      </td>

                      <td className="hidden px-5 py-4 md:table-cell">
                        <span className="text-sm text-[color:var(--text-3)]">
                          {fechaCorta(new Date(cliente.createdAt))}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/pedidos/nuevo?clienteId=${cliente.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-500 hover:text-white dark:bg-brand-500/15 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
                        >
                          <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                          Nuevo pedido
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-componentes ─────────────────────────────────────── */

function KpiCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: "blue" | "green" | "purple"; icon: React.ReactNode;
}) {
  const palette = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    green:  "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  }[color];

  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-well)] ${palette}`}
        style={{ boxShadow: "inset 0 0 0 1px color-mix(in srgb, currentColor 22%, transparent)" }}>
        {icon}
      </div>
      <p className="text-2xl font-black text-[color:var(--text-1)]">{value.toLocaleString("es-CO")}</p>
      <p className="mt-0.5 text-sm font-medium text-[color:var(--text-3)]">{label}</p>
    </div>
  );
}
